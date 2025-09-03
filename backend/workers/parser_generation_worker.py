#!/usr/bin/env python3
"""
Parser Generation Worker - Generates new parsers using AI for URLPrefix objects from queue
"""

import os
import logging
import asyncio

from parser import ParserGenerator
from data_models import URLPrefix, ParserGeneratorConfig
from redis_utils import get_redis
from redis_queue import get_from_queue
from db import get_production_config, save, is_system_running

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ParserGenerationWorker:
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.redis_client = get_redis(redis_url)
        
    async def get_production_generator_config(self) -> ParserGeneratorConfig:
        """Get the current production parser generator config"""
        config_name = get_production_config()
        if not config_name:
            raise ValueError("No production config set")
        
        logger.info(f"Using production config: {config_name}")
        return ParserGeneratorConfig.from_config(config_name)
    
    def reset_failed_url_prefix(self, url_prefix: URLPrefix) -> None:
        """Reset a failed URLPrefix to None status for retry"""
        url_prefix.processing_status = None
        save(url_prefix)
        logger.info(f"Reset URLPrefix {url_prefix.prefix} from failed to None status")
    
    async def generate_parser_for_url_prefix(self, url_prefix: URLPrefix) -> URLPrefix:
        """Generate a parser config for a URLPrefix and update the object"""
        try:
            logger.info(f"Generating parser for URL prefix: {url_prefix.prefix}")
            
            # Get the production generator config
            generator_config = await self.get_production_generator_config()
            
            # Create parser generator
            parser_generator = ParserGenerator(generator_config)
            
            # Generate the parser
            parser = parser_generator.generate_parser(url_prefix)
            
            # Update the URLPrefix with the generated parser config
            url_prefix.parser_config = parser.config
            
            logger.info(f"Successfully generated parser config for {url_prefix.prefix}")
            logger.info(f"Parser config: {parser.config.model_dump()}")
            
            return url_prefix
            
        except Exception as e:
            logger.error(f"Error generating parser for {url_prefix.prefix}: {e}")
            raise
    
    async def process_url_prefix_job(self, url_prefix: URLPrefix) -> dict:
        """Process a single URLPrefix job"""
        try:
            logger.info(f"Processing URLPrefix job: {url_prefix.prefix}")
            
            # Check if this URLPrefix is already being processed
            from db import load
            existing_prefix = load(URLPrefix, url_prefix.prefix)
            if existing_prefix:
                # Handle backward compatibility - if processing_status doesn't exist, set it to None
                if not hasattr(existing_prefix, 'processing_status'):
                    existing_prefix.processing_status = None
                    save(existing_prefix)
                
                if existing_prefix.processing_status == "in_progress":
                    logger.info(f"URLPrefix {url_prefix.prefix} is already being processed, skipping")
                    return {
                        "status": "skipped",
                        "url_prefix_id": url_prefix.prefix,
                        "reason": "already in progress"
                    }
                elif existing_prefix.processing_status == "failed":
                    logger.info(f"URLPrefix {url_prefix.prefix} was previously failed, resetting to None")
                    self.reset_failed_url_prefix(existing_prefix)
                    # Use the existing prefix with reset status
                    url_prefix = existing_prefix
            
            # Mark as in progress and save
            url_prefix.processing_status = "in_progress"
            save(url_prefix)
            logger.info(f"Marked URLPrefix {url_prefix.prefix} as in progress")
            
            # Generate parser for the URL prefix
            updated_url_prefix = await self.generate_parser_for_url_prefix(url_prefix)
            
            # Mark as completed and save the updated URLPrefix to the database
            updated_url_prefix.processing_status = "completed"
            save(updated_url_prefix)
            
            logger.info(f"Successfully saved updated URLPrefix: {url_prefix.prefix}")
            
            return {
                "status": "success",
                "url_prefix_id": url_prefix.prefix,
                "parser_config": updated_url_prefix.parser_config.model_dump() if updated_url_prefix.parser_config else None
            }
            
        except Exception as e:
            logger.error(f"Error processing URLPrefix job for {url_prefix.prefix}: {e}")
            
            # Mark as failed and save
            try:
                url_prefix.processing_status = "failed"
                save(url_prefix)
                logger.info(f"Marked URLPrefix {url_prefix.prefix} as failed")
            except Exception as save_error:
                logger.error(f"Failed to save failed status for {url_prefix.prefix}: {save_error}")
            
            return {
                "status": "error",
                "url_prefix_id": url_prefix.prefix,
                "error": str(e)
            }
    
    async def run(self):
        """Main worker loop - continuously process URLPrefix objects from queue"""
        logger.info("Starting parser generation worker...")
        
        while True:
            try:
                # Check system state before processing
                if not is_system_running():
                    logger.info("System is paused, waiting...")
                    await asyncio.sleep(5)  # Wait longer when paused
                    continue
                
                # Get URLPrefix from queue using exa_queue functionality
                url_prefix = get_from_queue(URLPrefix)
                
                if url_prefix is None:
                    # No URLPrefix available, wait a bit before checking again
                    await asyncio.sleep(1)
                    continue
                
                logger.info(f"Retrieved URLPrefix from queue: {url_prefix.prefix}")
                
                # Process the URLPrefix job
                result = await self.process_url_prefix_job(url_prefix)

                await asyncio.sleep(1)
                
                if result["status"] == "success":
                    logger.info(f"Successfully processed URLPrefix: {url_prefix.prefix}")
                elif result["status"] == "skipped":
                    logger.info(f"Skipped URLPrefix: {url_prefix.prefix} - {result.get('reason')}")
                else:
                    logger.error(f"Failed to process URLPrefix: {url_prefix.prefix} - {result.get('error')}")
                
            except KeyboardInterrupt:
                logger.info("Received interrupt signal, shutting down...")
                break
            except Exception as e:
                logger.error(f"Unexpected error in worker loop: {e}")
                await asyncio.sleep(1)  # Brief pause before retrying


async def main():
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    worker = ParserGenerationWorker(redis_url)
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
