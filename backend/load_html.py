import requests
from pathlib import Path


UA = "parser-generator/1.0 (jan.vegt@gmail.com)"
headers = {"User-Agent": UA}


def load_raw_html(url: str) -> str:
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.text


def load_html_to_file(url: str, output_path: str) -> None:
    """Load HTML from a URL and write it to a file path."""
    html_content = load_raw_html(url)
    
    # Ensure the directory exists
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    # Write the HTML content to the file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
