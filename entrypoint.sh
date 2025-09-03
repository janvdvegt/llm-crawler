#!/bin/bash
set -e

# Change to backend directory for all Python operations
cd /app/backend

# Default to API mode if no command specified
if [ $# -eq 0 ]; then
    exec python api.py
fi

# Handle different service types
case "$1" in
    "api")
        echo "Starting API server..."
        exec python api.py
        ;;
    "parsing-worker")
        echo "Starting parsing worker..."
        exec python -m workers.parsing_worker
        ;;
    "parser-generation-worker")
        echo "Starting parser generation worker..."
        exec python -m workers.parser_generation_worker
        ;;
    "eval")
        echo "Running evaluation..."
        shift
        exec python evaluation.py "$@"
        ;;
    *)
        echo "Unknown service: $1"
        echo "Available services: api, parsing-worker, parser-generation-worker, eval"
        exit 1
        ;;
esac
