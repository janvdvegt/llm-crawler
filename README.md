# Web Crawling and Evaluation System

A comprehensive web crawling and evaluation system with a modern React UI, API backend, and monitoring infrastructure.

## System Overview

This system consists of several interconnected components:

### Core Components

- **API for UI** (`backend/api.py`, `backend/main.py`) - FastAPI-based REST API that serves the frontend and handles data operations
- **React-based UI** (`frontend/`) - Modern React application with TypeScript for data visualization and system management
- **CLI for running evals** (`backend/evaluation.py`) - Command-line interface for executing evaluation tasks
- **Worker for parsing URLs** (`backend/workers/parsing_worker.py`) - Background worker that processes and parses web URLs
- **Worker for generating configurations** (`backend/workers/parser_generation_worker.py`) - Worker that creates configurations for URL prefixes
- **Prometheus** (`prometheus.yml`) - Metrics collection and monitoring system
- **Grafana** (`grafana/`) - Dashboard and visualization platform for system metrics

### Additional Components

- **Database** (`backend/db.py`) - Data persistence layer
- **Queue System** (`backend/redis_queue.py`, `backend/redis_utils.py`) - Task queue management using Redis
- **Data Models** (`backend/data_models.py`) - Pydantic models for data validation
- **HTML Processing** (`backend/clean_html.py`, `backend/load_html.py`, `backend/parser.py`) - HTML parsing and cleaning utilities

## Development Setup

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Set up environment variables:**
   ```bash
   # Copy the example environment file
   cp ../env.example .env
   
   # Edit the .env file to add your OpenAI API key
   # Replace 'your_openai_api_key_here' with your actual OpenAI API key
   ```

   **Required Environment Variables:**
   - `OPENAI_API_KEY` - Your OpenAI API key (required for parser generation)
   - `REDIS_URL` - Redis connection URL (default: `redis://localhost:6379/0`)
   - `PORT` - API server port (default: `8000`)
   - `HOST` - API server host (default: `0.0.0.0`)
   - `DEBUG` - Debug mode (default: `false`)

3. **Set up Python virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

4. **Install dependencies:**
   ```bash
   pip install -r ../requirements.txt
   ```

5. **Run the API server:**
   ```bash
   python main.py
   ```

**Important:** Always ensure you're in the `backend` directory when running any Python commands, as the code expects to be executed from that location.

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   Open your browser and navigate to `http://localhost:5173`

### Docker Setup

The system includes Docker Compose configuration for easy deployment and development:

1. **Build and start all containers:**
   ```bash
   docker compose up --build
   ```

This command will:
- Build all Docker images for the API, frontend, workers, Redis, Prometheus, and Grafana
- Start all services with proper networking
- Set up persistent data storage
- Configure monitoring and metrics collection

2. **Access the services:**
   - Frontend: `http://localhost:8000`
   - API: `http://localhost:8000/api`
   - Grafana: `http://localhost:3000`
   - Prometheus: `http://localhost:9090`

### Scaling Workers

To scale up specific worker services for better performance:

```bash
# Scale parsing workers
docker compose up --scale parsing-worker=3

# Scale parser generation workers
docker compose up --scale parser-generation-worker=2

# Scale multiple worker types
docker compose up --scale parsing-worker=3 --scale parser-generation-worker=2
```

You can also modify the `docker-compose.yaml` file to set default scaling:

```yaml
services:
  parsing-worker:
    # ... other configuration
    deploy:
      replicas: 3
  
  parser-generation-worker:
    # ... other configuration
    deploy:
      replicas: 2
```

### Development Workflow

1. **For backend development:**
   - Make changes in the `backend/` directory
   - Restart the Python server to see changes
   - Use the CLI tools for testing: `python evaluation.py`

2. **For frontend development:**
   - Make changes in the `frontend/src/` directory
   - The development server will hot-reload automatically
   - Access the UI at `localhost:5173`

3. **For full-stack development:**
   - Run both backend and frontend in separate terminals
   - Use Docker Compose for testing the complete system

## Configuration

The system uses YAML configuration files located in the `configs/` directory for different environments and use cases.

## Evaluations

The system includes a comprehensive evaluation framework for testing and validating web crawling performance:

### Running Evaluations

Evaluations are executed using the CLI tool located in `backend/evaluation.py`:

```bash
python evaluation.py eval --config low_no_ref low minimal_no_ref minimal medium medium_no_ref --domain exa
```

### Parameters

- **`--config`**: Specifies one or more configuration files to test. These YAML files define different crawling strategies and parameters:
  - `low_no_ref`, `low` - Low reasoning configurations
  - `minimal_no_ref`, `minimal` - Minimal reasoning configurations  
  - `medium`, `medium_no_ref` - Medium reasoning configurations
  - `high`, `high_no_ref` - High reasoning configurations
  - The `_no_ref` variants exclude the self reference step

- **`--domain`**: Specifies the domain to evaluate against. Common domains include:
  - `exa` - Exa documentation test cases
  - `databricks` - Databricks documentation test cases
  - `hackernews` - Hacker News content test cases

### Evaluation Data

Evaluation inputs and validation data are stored in the `evals/` directory, organized by domain:
- `evals/exa/input/` - Test cases for Exa domain
- `evals/exa/validation/` - Expected results and validation criteria
- Similar structure for other domains (`databricks/`, `hackernews/`)

## Monitoring

- **Prometheus** collects metrics from all services
- **Grafana** provides dashboards for visualizing system performance
- Metrics are stored in the `data/` directory for persistence

## Project Structure

```
root
├── backend/           # FastAPI backend and workers
├── frontend/          # React TypeScript frontend
├── configs/           # Configuration files
├── evals/             # Evaluation data and tests
├── grafana/           # Grafana dashboards and config
├── data/              # Persistent data storage
├── docker-compose.yaml # Docker orchestration
└── requirements.txt   # Python dependencies
```

