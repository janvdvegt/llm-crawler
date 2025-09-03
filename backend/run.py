#!/usr/bin/env python3
"""
Runner script for backend Python scripts.
This script ensures all Python scripts run from the backend directory.
"""

import sys
import os
import subprocess
from pathlib import Path

def main():
    if len(sys.argv) < 2:
        print("Usage: python run.py <script_name> [args...]")
        print("Available scripts:")
        print("  api                    - Run the API server")
        print("  parsing-worker         - Run the parsing worker")
        print("  parser-generation-worker - Run the parser generation worker")
        print("  evaluation             - Run evaluation")
        print("  test_sample_urls       - Run test sample URLs script")
        print("  test_paths             - Test path resolution")
        print("  <script_name>.py       - Run any .py file directly")
        sys.exit(1)
    
    script_name = sys.argv[1]
    args = sys.argv[2:]
    
    # Ensure we're in the backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Map script names to actual files
    script_map = {
        "api": "api.py",
        "parsing-worker": "workers/parsing_worker.py",
        "parser-generation-worker": "workers/parser_generation_worker.py",
        "evaluation": "evaluation.py",
        "test_sample_urls": "test_sample_urls.py",
        "test_paths": "test_paths.py",
    }
    
    # Get the actual script path
    if script_name in script_map:
        script_path = script_map[script_name]
    elif script_name.endswith('.py'):
        script_path = script_name
    else:
        script_path = f"{script_name}.py"
    
    # Check if the script exists
    if not Path(script_path).exists():
        print(f"Error: Script '{script_path}' not found")
        sys.exit(1)
    
    # Run the script
    try:
        subprocess.run([sys.executable, script_path] + args, check=True)
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)
    except KeyboardInterrupt:
        print("\nInterrupted by user")
        sys.exit(1)

if __name__ == "__main__":
    main()
