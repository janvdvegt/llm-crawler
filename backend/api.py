from pathlib import Path
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from fastapi import APIRouter
from typing import Optional, List
from contextlib import asynccontextmanager
import uvicorn
import logging
from datetime import datetime, timezone
import os
import urllib.parse
from prometheus_client.core import REGISTRY
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

from metrics_collector import RedisModelCollector, RedisQueueCollector
from data_models import EvaluationRun, ParserGeneratorConfig, URL, URLPrefix, URLPrefixWithUrls, SampleURL, URLQueueItem
from db import count, load, scan, delete_all, get_production_config, set_production_config, get_system_state, set_system_state, is_system_running, delete
from redis_queue import add_to_queue, queue_length


# Request model for adding URLPrefix to queue
class AddURLPrefixRequest(BaseModel):
    prefix: str
    sample_urls: List[str] = Field(default_factory=list, description="List of sample URLs")


# Request model for adding URLQueueItem to queue
class AddURLQueueItemRequest(BaseModel):
    url: str
    process_from_unix_timestamp: Optional[int] = None
    times_queued: int = 0


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager"""
    # Startup
    logger.info("Starting LLM-based crawler API...")
    REGISTRY.register(RedisModelCollector(count, [EvaluationRun, URLPrefix, URL]))
    REGISTRY.register(RedisQueueCollector(queue_length, [URLQueueItem, URLPrefix]))
    
    # Initialize production config if none is set
    try:
        current_production_config = get_production_config()
        if not current_production_config:
            # Get all available config files and sort them alphabetically
            config_files = list(Path(__file__).parent.parent.glob("configs/*.yaml"))
            if config_files:
                # Sort by filename (stem) alphabetically
                config_files.sort(key=lambda x: x.stem)
                first_config_name = config_files[0].stem
                set_production_config(first_config_name)
                logger.info(f"No production config set. Automatically set '{first_config_name}' as production config.")
            else:
                logger.warning("No config files found in configs/ directory")
        else:
            logger.info(f"Production config already set to: {current_production_config}")
    except Exception as e:
        logger.error(f"Error initializing production config: {str(e)}")
    
    yield
    # Shutdown
    logger.info("Shutting down LLM-based crawler API...")


# Initialize FastAPI app
app = FastAPI(
    title="LLM-based crawler API",
    description="A FastAPI-based API for the LLM-based crawler project",
    version="1.0.0",
    lifespan=lifespan
)


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- Frontend (Vite build) -----
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
INDEX_FILE = FRONTEND_DIST / "index.html"

# Serve static assets (e.g. dist/assets/...) at /assets
app.mount(
    "/assets",
    StaticFiles(directory=FRONTEND_DIST / "assets", check_dir=False),
    name="assets",
)

# Root -> index.html (if built)
@app.get("/")
def serve_index():
    if INDEX_FILE.exists():
        return FileResponse(INDEX_FILE)
    return JSONResponse({"detail": "Frontend not built. Run: cd frontend && npm run build"}, status_code=503)


# --- API router (keep APIs under /api so static mount can live at "/") ---
api = APIRouter(prefix="/api")


@api.get("/evaluation_runs", response_model=list[EvaluationRun])
def get_evaluation_runs():
    return scan(EvaluationRun)


@api.get("/evaluation_runs/{id}", response_model=EvaluationRun)
def get_evaluation_run(id: str):
    return load(EvaluationRun, id)


@api.delete("/evaluation_runs/{id}")
def delete_evaluation_run(id: str):
    """Delete a specific evaluation run by ID"""
    try:
        evaluation_run = load(EvaluationRun, id)
        if not evaluation_run:
            raise HTTPException(status_code=404, detail=f"Evaluation run '{id}' not found")
        
        delete(EvaluationRun, id)
        return {
            "message": f"Successfully deleted evaluation run '{id}'",
            "deleted_id": id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting evaluation run '{id}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete evaluation run")


@api.delete("/evaluation_runs")
def clear_evaluation_runs():
    """Clear all evaluation runs from the database"""
    try:
        deleted_count = delete_all(EvaluationRun)
        return {
            "message": f"Cleared {deleted_count} evaluation runs",
            "deleted_count": deleted_count
        }
    except Exception as e:
        logger.error(f"Error clearing evaluation runs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to clear evaluation runs")


@api.delete("/data/{model_name}")
def clear_model_data(model_name: str):
    """Clear all data for a specific model type from the database"""
    try:
        # Map model names to model classes
        model_map = {
            "evaluation_runs": EvaluationRun,
            "urls": URL,
            # Add other models as needed
        }
        
        if model_name not in model_map:
            raise HTTPException(status_code=400, detail=f"Unknown model: {model_name}. Available models: {list(model_map.keys())}")
        
        model_class = model_map[model_name]
        deleted_count = delete_all(model_class)
        return {
            "message": f"Cleared {deleted_count} {model_name}",
            "deleted_count": deleted_count,
            "model_name": model_name
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing {model_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to clear {model_name}")


@api.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


# Config routes
@api.get("/configs")
def list_configs():
    """List all available config files"""
    try:
        configs = []
        for config_file in Path(__file__).parent.parent.glob("configs/*.yaml"):
            config_name = config_file.stem
            try:
                config = ParserGeneratorConfig.from_config(config_name)
                # Include the dynamic is_production field in the response
                config_dict = config.model_dump()
                config_dict["is_production"] = config.is_production
                configs.append(config_dict)
            except Exception as e:
                logger.warning(f"Failed to load config '{config_name}': {str(e)}")
                continue
        return configs
    except Exception as e:
        logger.error(f"Error listing configs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list configs")


@api.get("/configs/{config_name}")
def get_config(config_name: str):
    """Get a specific config file by name"""
    try:
        config = ParserGeneratorConfig.from_config(config_name)
        # Include the dynamic is_production field in the response
        config_dict = config.model_dump()
        config_dict["is_production"] = config.is_production
        return config_dict
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Config '{config_name}' not found")
    except Exception as e:
        logger.error(f"Error loading config '{config_name}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to load config")


@api.get("/configs/production/current")
def get_current_production_config():
    """Get the current production config name"""
    try:
        production_config = get_production_config()
        return {"production_config": production_config}
    except Exception as e:
        logger.error(f"Error getting production config: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get production config")


@api.put("/configs/production/{config_name}")
def set_production_config_route(config_name: str):
    """Set the production config"""
    try:
        # Verify the config exists
        config_path = Path(__file__).parent.parent / "configs" / f"{config_name}.yaml"
        if not config_path.exists():
            raise HTTPException(status_code=404, detail=f"Config '{config_name}' not found")
        
        set_production_config(config_name)
        return {"message": f"Production config set to '{config_name}'", "production_config": config_name}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting production config to '{config_name}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to set production config")


# System state management endpoints
@api.get("/system/state")
def get_system_state_route():
    """Get the current system state"""
    try:
        state = get_system_state()
        return {"state": state, "is_running": is_system_running()}
    except Exception as e:
        logger.error(f"Error getting system state: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get system state")


@api.put("/system/state")
def set_system_state_route(state: str):
    """Set the system state to PAUSE or RUNNING"""
    try:
        set_system_state(state)
        return {
            "message": f"System state set to '{state}'",
            "state": state,
            "is_running": is_system_running()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error setting system state to '{state}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to set system state")


@api.post("/urlprefix/queue")
def add_urlprefix_to_queue(request: AddURLPrefixRequest):
    """Add a URLPrefix to the queue with only prefix and sample_urls"""
    try:
        # Convert string URLs to SampleURL objects with loaded raw content
        sample_urls = [SampleURL.from_url(url) for url in request.sample_urls]
        
        # Create URLPrefix with only prefix and sample_urls
        url_prefix = URLPrefix(
            prefix=request.prefix,
            sample_urls=sample_urls
        )
        
        # Add to queue
        success = add_to_queue(url_prefix, queue_name="queue:urlprefix")
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to add URLPrefix to queue")
        
        return {
            "message": f"URLPrefix '{request.prefix}' added to queue successfully",
            "prefix": request.prefix,
            "sample_urls_count": len(request.sample_urls),
            "queue_name": "queue:urlprefix"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding URLPrefix to queue: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add URLPrefix to queue")


@api.post("/urlqueueitem/queue")
def add_urlqueueitem_to_queue(request: AddURLQueueItemRequest):
    """Add a URLQueueItem to the queue"""
    try:
        import time
        
        # Create URL object
        url = URL(url=request.url)
        
        # Use current timestamp if not provided
        process_from_timestamp = request.process_from_unix_timestamp
        if process_from_timestamp is None:
            process_from_timestamp = int(time.time())
        
        # Create URLQueueItem
        url_queue_item = URLQueueItem(
            url=url,
            process_from_unix_timestamp=process_from_timestamp,
            times_queued=request.times_queued
        )
        
        # Add to queue
        success = add_to_queue(url_queue_item)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to add URLQueueItem to queue")
        
        return {
            "message": f"URLQueueItem for URL '{request.url}' added to queue successfully",
            "url": request.url,
            "process_from_timestamp": process_from_timestamp,
            "times_queued": request.times_queued,
            "queue_name": "queue:urlqueueitem"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding URLQueueItem to queue: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add URLQueueItem to queue")


@api.get("/urlprefix", response_model=list[URLPrefixWithUrls])
def get_urlprefix_list():
    """Get a list of all URLPrefix objects with all associated URLs"""
    try:
        urlprefixes = scan(URLPrefix)
        result = []
        
        for urlprefix in urlprefixes:
            # Create URLPrefixWithUrls to include all associated URLs
            urlprefix_with_urls = URLPrefixWithUrls.from_url_prefix(urlprefix)
            result.append(urlprefix_with_urls)
        
        return result
    except Exception as e:
        logger.error(f"Error retrieving URLPrefix list: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve URLPrefix list")


@api.get("/urlprefix/{prefix_id:path}", response_model=URLPrefixWithUrls)
def get_urlprefix(prefix_id: str):
    """Get a specific URLPrefix by its prefix ID with all associated URLs"""
    try:
        # Decode the URL-encoded prefix_id
        decoded_prefix = prefix_id
        try:
            decoded_prefix = urllib.parse.unquote(prefix_id)
        except Exception:
            # If URL decoding fails, use the original
            pass
            
        urlprefix = load(URLPrefix, decoded_prefix)
        if urlprefix is None:
            raise HTTPException(status_code=404, detail=f"URLPrefix with prefix '{decoded_prefix}' not found")
        
        # Create the wrapper with all URLs
        urlprefix_with_urls = URLPrefixWithUrls.from_url_prefix(urlprefix)
        return urlprefix_with_urls
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving URLPrefix '{decoded_prefix}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve URLPrefix")


@api.delete("/urlprefix/{prefix_id:path}")
def delete_urlprefix(prefix_id: str):
    """Delete a URLPrefix and all its associated URLs"""
    try:
        # Decode the URL-encoded prefix_id
        decoded_prefix = prefix_id
        try:
            decoded_prefix = urllib.parse.unquote(prefix_id)
        except Exception:
            # If URL decoding fails, use the original
            pass
            
        # Load the URLPrefix to get its associated URLs
        urlprefix = load(URLPrefix, decoded_prefix)
        if urlprefix is None:
            raise HTTPException(status_code=404, detail=f"URLPrefix with prefix '{decoded_prefix}' not found")
        
        # Delete all associated URLs
        deleted_urls_count = 0
        
        # Delete URLs from sample_urls
        for sample_url in urlprefix.sample_urls:
            if delete(URL, sample_url.url):
                deleted_urls_count += 1
        
        # Delete URLs from validation_urls if they exist
        if urlprefix.validation_urls:
            for validation_url in urlprefix.validation_urls:
                if delete(URL, validation_url.url):
                    deleted_urls_count += 1
        
        # Delete URLs from the database that have this prefix
        from db import find_urls_with_prefix
        db_urls = find_urls_with_prefix(decoded_prefix)
        for url_obj in db_urls:
            if delete(URL, url_obj.url):
                deleted_urls_count += 1
        
        # Delete the URLPrefix itself
        if not delete(URLPrefix, decoded_prefix):
            raise HTTPException(status_code=500, detail="Failed to delete URLPrefix")
        
        return {
            "message": f"URLPrefix '{decoded_prefix}' and {deleted_urls_count} associated URLs deleted successfully",
            "prefix": decoded_prefix,
            "deleted_urls_count": deleted_urls_count
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting URLPrefix '{decoded_prefix}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete URLPrefix")


@api.get("/urls/{url_id:path}")
def get_url(url_id: str):
    """Get a specific URL by its URL"""
    try:
        # Decode the URL-encoded url_id
        decoded_url = url_id
        try:
            decoded_url = urllib.parse.unquote(url_id)
        except Exception:
            # If URL decoding fails, use the original
            pass
            
        # Load the URL object
        url_obj = load(URL, decoded_url)
        if url_obj is None:
            raise HTTPException(status_code=404, detail=f"URL '{decoded_url}' not found")
        
        return url_obj
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving URL '{decoded_url}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve URL")


@api.get("/urls")
def get_urls_list():
    """Get a list of all URL objects"""
    try:
        urls = scan(URL)
        return urls
    except Exception as e:
        logger.error(f"Error retrieving URLs list: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve URLs list")


@api.get("/urls/evaluated")
def get_evaluated_urls():
    """Get a list of all URLs that have been evaluated"""
    try:
        evaluation_runs = scan(EvaluationRun)
        evaluated_urls = set()
        
        for run in evaluation_runs:
            for result in run.results:
                evaluated_urls.add(result.url)
        
        return sorted(list(evaluated_urls))
    except Exception as e:
        logger.error(f"Error retrieving evaluated URLs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve evaluated URLs")


@api.get("/urls/{url_id:path}/details")
def get_url_details(url_id: str):
    """Get detailed information about a specific URL including evaluation results"""
    try:
        # Decode the URL-encoded url_id
        decoded_url = url_id
        try:
            decoded_url = urllib.parse.unquote(url_id)
        except Exception:
            # If URL decoding fails, use the original
            pass
            
        # Load the URL object
        url_obj = load(URL, decoded_url)
        
        # Get evaluation results for this URL
        evaluation_runs = scan(EvaluationRun)
        url_results = []
        
        for run in evaluation_runs:
            for result in run.results:
                if result.url == decoded_url:
                    url_results.append(result)
        
        # Calculate statistics
        total_evaluations = len(url_results)
        average_accuracy = 0
        latest_result = None
        
        if url_results:
            # Calculate average accuracy
            accuracies = [1 - result.abs_levenshtein_distance_norm for result in url_results]
            average_accuracy = sum(accuracies) / len(accuracies)
            
            # Get latest result (most recent evaluation run)
            latest_run = max(evaluation_runs, key=lambda run: run.datetime_str)
            latest_result = next((result for result in latest_run.results if result.url == decoded_url), None)
        
        return {
            "url": decoded_url,
            "domain": url_obj.prefix or "",
            "evaluation_results": url_results,
            "latest_result": latest_result,
            "average_accuracy": average_accuracy,
            "total_evaluations": total_evaluations,
            "url_object": url_obj,
            "has_stored_object": url_obj is not None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving URL details for '{decoded_url}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve URL details")


@api.delete("/urls/{url_id:path}")
def delete_url(url_id: str):
    """Delete a specific URL by its URL"""
    try:
        # Decode the URL-encoded url_id
        decoded_url = url_id
        try:
            decoded_url = urllib.parse.unquote(url_id)
        except Exception:
            # If URL decoding fails, use the original
            pass
            
        # Check if URL exists
        url_obj = load(URL, decoded_url)
        if url_obj is None:
            raise HTTPException(status_code=404, detail=f"URL '{decoded_url}' not found")
        
        # Delete the URL
        if not delete(URL, decoded_url):
            raise HTTPException(status_code=500, detail="Failed to delete URL")
        
        return {
            "message": f"URL '{decoded_url}' deleted successfully",
            "url": decoded_url
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting URL '{decoded_url}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete URL")


app.include_router(api)

# Catch-all route for frontend SPA routing (must be after API router)
@app.get("/{full_path:path}")
def serve_frontend(full_path: str):
    # Skip API routes - let them be handled by the API router
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
    
    # Skip assets - let them be handled by the static files mount
    if full_path.startswith("assets/"):
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # For all other routes, serve the frontend index.html
    if INDEX_FILE.exists():
        return FileResponse(INDEX_FILE)
    return JSONResponse({"detail": "Frontend not built. Run: cd frontend && npm run build"}, status_code=503)


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    timestamp: str


# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    """Global HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            timestamp=datetime.now(timezone.utc).isoformat()
        ).model_dump()
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    """Global exception handler for unexpected errors"""
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="Internal server error",
            detail="An unexpected error occurred",
            timestamp=datetime.now(timezone.utc).isoformat()
        ).model_dump()
    )

# Main function to run the server
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    debug = os.getenv("DEBUG", "false").lower() == "true"
    
    uvicorn.run(
        "api:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )
