from pathlib import Path

# Full path to *this* file
THIS_FILE = Path(__file__).resolve()

# Directory containing this file
THIS_DIR = THIS_FILE.parent

CONFIGS_PATH = THIS_DIR.parent / "configs"
EVALS_PATH = THIS_DIR.parent / "evals"
