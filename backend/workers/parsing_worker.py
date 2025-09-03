#!/usr/bin/env python3
"""
Parsing Worker - Processes URLQueueItems using existing parsers
"""

import os
import logging
import asyncio
import time
from typing import List
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup

from parser import Parser
from data_models import SampleURL, URLQueueItem, URLPrefix, URL
from redis_utils import get_redis
from redis_queue import get_from_queue, add_to_queue
from db import find_prefix_for_url, save, load, is_system_running, find_urls_with_prefix
from load_html import load_raw_html

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ParsingWorker:
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.redis_client = get_redis(redis_url)
        
    def get_deepest_prefix(self, url: str) -> str:
        """Get the deepest prefix for a URL (e.g., https://example.com/path/ for https://example.com/path/page.html)"""
        # Remove query parameters and fragments
        if '?' in url:
            url = url.split('?')[0]
        if '#' in url:
            url = url.split('#')[0]
            
        # Split by '/' and remove the last segment if it's not empty
        parts = url.split('/')
        if len(parts) > 3:  # Has path beyond domain
            # Remove the last non-empty part
            while parts and not parts[-1]:
                parts.pop()
            if parts:
                parts.pop()  # Remove the last segment
            return '/'.join(parts)
        else:
            # No path beyond domain, return the domain with trailing slash
            return '/'.join(parts)
    
    def normalize_url(self, url: str) -> str:
        """Normalize URL by removing tracking parameters, normalizing trailing slashes, and www subdomain"""
        try:
            # Parse the URL
            parsed = urlparse(url)
            
            # Normalize scheme to lowercase
            scheme = parsed.scheme.lower()
            
            # Normalize netloc (domain and port)
            netloc = parsed.netloc.lower()
            
            # Remove www. prefix if present
            if netloc.startswith('www.'):
                netloc = netloc[4:]
            
            # Remove default ports
            if scheme == 'https' and ':443' in netloc:
                netloc = netloc.replace(':443', '')
            elif scheme == 'http' and ':80' in netloc:
                netloc = netloc.replace(':80', '')
            
            # Normalize path
            path = parsed.path
            
            # Remove trailing slash unless it's the root path
            if path != '/' and path.endswith('/'):
                path = path[:-1]
            
            # Normalize query parameters
            query_params = []
            if parsed.query:
                from urllib.parse import parse_qs, urlencode
                
                # Parse query parameters
                params = parse_qs(parsed.query)
                
                # List of tracking parameters to remove
                tracking_params = {
                    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                    'fbclid', 'gclid', 'msclkid', 'ref', 'source', 'campaign',
                    'sessionid', 'sid', 'token', 'auth', 'key'
                }
                
                # Filter out tracking parameters and empty values
                for key, values in params.items():
                    if key.lower() not in tracking_params:
                        # Keep non-empty values
                        non_empty_values = [v for v in values if v.strip()]
                        if non_empty_values:
                            query_params.extend([(key, v) for v in non_empty_values])
                
                # Sort parameters for consistency
                query_params.sort()
            
            # Reconstruct the URL
            normalized_url = f"{scheme}://{netloc}{path}"
            if query_params:
                normalized_url += "?" + urlencode(query_params)
            
            return normalized_url
            
        except Exception as e:
            logger.debug(f"Failed to normalize URL {url}: {e}")
            return url
    
    def extract_links_from_html(self, html_content: str, base_url: str, target_prefix: str) -> List[str]:
        """Extract links from HTML content that share the same prefix"""
        links = []
        
        try:
            # Parse HTML with BeautifulSoup
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Find all anchor tags
            anchor_tags = soup.find_all('a', href=True)
            
            for anchor in anchor_tags:
                href = anchor.get('href')
                if not href:
                    continue
                
                try:
                    # Resolve relative URLs to absolute URLs
                    absolute_url = urljoin(base_url, href)
                    
                    # Remove anchor (fragment identifier) from URL
                    if '#' in absolute_url:
                        absolute_url = absolute_url.split('#')[0]
                    
                    # Normalize the URL
                    normalized_url = self.normalize_url(absolute_url)
                    
                    # Parse the URL to normalize it
                    parsed_url = urlparse(normalized_url)
                    
                    # Skip if it's not an HTTP/HTTPS URL
                    if parsed_url.scheme not in ['http', 'https']:
                        continue
                    
                    # Skip if it's the same as the base URL (after normalization)
                    normalized_base_url = self.normalize_url(base_url)
                    if normalized_url == normalized_base_url:
                        continue
                    
                    # Check if the URL shares the same prefix
                    if normalized_url.startswith(target_prefix):
                        links.append(normalized_url)
                        
                except Exception as e:
                    logger.debug(f"Failed to process link {href}: {e}")
                    continue
            
            # Remove duplicates while preserving order
            unique_links = []
            seen = set()
            for link in links:
                if link not in seen:
                    unique_links.append(link)
                    seen.add(link)
            
            return unique_links
            
        except Exception as e:
            logger.error(f"Failed to parse HTML content: {e}")
            return []
    
    async def process_url_queue_item(self, queue_item: URLQueueItem) -> dict:
        """Process a single URLQueueItem"""
        try:
            # logger.info(f"Processing URLQueueItem for URL: {queue_item.url.url}")
            
            # Check if URL should be processed based on timestamp
            current_time = int(time.time())
            if current_time < queue_item.process_from_unix_timestamp:
                # logger.info(f"URL {queue_item.url.url} not ready for processing yet. Current time: {current_time}, required: {queue_item.process_from_unix_timestamp}")
                # Put it back on the queue without incrementing times_queued
                add_to_queue(queue_item)
                return {
                    "status": "deferred",
                    "url": queue_item.url.url,
                    "reason": "not ready for processing"
                }
            
            # Check if there's a URL prefix for this URL
            url_prefix = find_prefix_for_url(queue_item.url.url)
            
            # If we have a prefix, check if we've already exceeded the URL limit
            if url_prefix:
                # Count existing URLs for this prefix
                existing_urls = find_urls_with_prefix(url_prefix.prefix)
                url_count = len(existing_urls)
                
                # If we already have 20 or more URLs for this prefix, drop this URL from the queue
                if url_count >= 20:
                    logger.info(f"Dropping URL {queue_item.url.url} from queue - prefix {url_prefix.prefix} already has {url_count} URLs (limit: 50)")
                    return {
                        "status": "dropped",
                        "url": queue_item.url.url,
                        "reason": f"prefix {url_prefix.prefix} already has {url_count} URLs (limit: 20)"
                    }
            
            if url_prefix and url_prefix.parser_config:
                logger.info(f"Found existing parser for URL: {queue_item.url.url}")
                
                # Check if URL already exists in database
                existing_url = load(URL, queue_item.url.url)
                if existing_url and existing_url.parsed_content:
                    logger.info(f"URL {queue_item.url.url} already exists and has been parsed, skipping")
                    return {
                        "status": "skipped",
                        "url": queue_item.url.url,
                        "reason": "already exists and parsed"
                    }
                
                # Load raw HTML content
                try:
                    raw_content = load_raw_html(queue_item.url.url)
                    queue_item.url.raw_content = raw_content
                except Exception as e:
                    logger.error(f"Failed to load HTML for {queue_item.url.url}: {e}")
                    return {
                        "status": "error",
                        "url": queue_item.url.url,
                        "error": f"Failed to load HTML: {str(e)}"
                    }
                
                # Parse content using existing parser
                try:
                    parser = Parser(url_prefix.parser_config)
                    parsed_content = parser.parse(raw_content)
                    queue_item.url.parsed_content = parsed_content
                    queue_item.url.prefix = url_prefix.prefix
                except Exception as e:
                    logger.error(f"Failed to parse content for {queue_item.url.url}: {e}")
                    return {
                        "status": "error",
                        "url": queue_item.url.url,
                        "error": f"Failed to parse content: {str(e)}"
                    }
                
                # Save the updated URL object
                save(queue_item.url)
                
                # Extract links from HTML that share the same prefix and add them to the queue
                try:
                    links_with_prefix = self.extract_links_from_html(raw_content, queue_item.url.url, url_prefix.prefix)
                    added_to_queue = 0
                    
                    for link_url in links_with_prefix:
                        # Skip if this URL already exists and has been parsed
                        existing_link_url = load(URL, link_url)
                        if existing_link_url and existing_link_url.parsed_content:
                            continue
                            
                        # Create URL object for this link
                        url_obj = URL(url=link_url, prefix=url_prefix.prefix)
                        
                        # Create URLQueueItem for this URL
                        url_queue_item = URLQueueItem(
                            url=url_obj,
                            process_from_unix_timestamp=int(time.time()),
                            times_queued=0
                        )
                        
                        # Add to queue
                        if add_to_queue(url_queue_item):
                            added_to_queue += 1
                            logger.info(f"Added URL with shared prefix to queue: {link_url}")
                    
                    if added_to_queue > 0:
                        logger.info(f"Added {added_to_queue} URLs with shared prefix to queue")
                        
                except Exception as e:
                    logger.error(f"Failed to add URLs with shared prefix to queue: {e}")
                    # Don't fail the entire operation for this error
                
                logger.info(f"Successfully processed URL: {queue_item.url.url}")
                return {
                    "status": "success",
                    "url": queue_item.url.url,
                    "parsed_content": parsed_content,
                    "prefix": url_prefix.prefix,
                    "urls_added_to_queue": added_to_queue if 'added_to_queue' in locals() else 0
                }
                
            else:
                logger.info(f"No existing parser found for URL: {queue_item.url.url}, creating URLPrefix")
                
                # Get the deepest prefix
                deepest_prefix = self.get_deepest_prefix(queue_item.url.url)
                
                # Create a new URLPrefix with the URL as a sample
                try:
                    raw_content = load_raw_html(queue_item.url.url)
                    sample_url = SampleURL(url=queue_item.url.url, raw_content=raw_content)
                    
                    # Check if URLPrefix already exists
                    existing_prefix = load(URLPrefix, deepest_prefix)
                    if existing_prefix:
                        # Add the sample URL to existing prefix
                        existing_prefix.sample_urls.append(sample_url)
                        save(existing_prefix)
                        logger.info(f"Added sample URL to existing prefix: {deepest_prefix}")
                    else:
                        # Create new URLPrefix
                        new_prefix = URLPrefix(
                            prefix=deepest_prefix,
                            sample_urls=[sample_url]
                        )
                        save(new_prefix)
                        logger.info(f"Created new URLPrefix: {deepest_prefix}")
                    
                    # Add the URLPrefix to the parser generation queue
                    add_to_queue(new_prefix if not existing_prefix else existing_prefix)
                    
                except Exception as e:
                    logger.error(f"Failed to create URLPrefix for {queue_item.url.url}: {e}")
                    return {
                        "status": "error",
                        "url": queue_item.url.url,
                        "error": f"Failed to create URLPrefix: {str(e)}"
                    }
                
                # Put the URLQueueItem back on the queue with updated timestamp and incremented counter
                queue_item.process_from_unix_timestamp = int(time.time()) + 30  # 30 seconds in the future
                queue_item.times_queued += 1
                add_to_queue(queue_item)
                
                logger.info(f"Re-queued URL {queue_item.url.url} for processing in 30 seconds (times_queued: {queue_item.times_queued})")
                return {
                    "status": "requeued",
                    "url": queue_item.url.url,
                    "reason": "no parser available, created URLPrefix",
                    "next_process_time": queue_item.process_from_unix_timestamp,
                    "times_queued": queue_item.times_queued
                }
            
        except Exception as e:
            logger.error(f"Error processing URLQueueItem for {queue_item.url.url}: {e}")
            return {
                "status": "error",
                "url": queue_item.url.url,
                "error": str(e)
            }
    
    async def run(self):
        """Main worker loop - continuously process URLQueueItems from queue"""
        logger.info("Starting parsing worker...")
        
        while True:
            try:
                # Check system state before processing
                if not is_system_running():
                    logger.info("System is paused, waiting...")
                    await asyncio.sleep(1)
                    continue
                
                # Get URLQueueItem from queue using redis_queue functionality
                queue_item = get_from_queue(URLQueueItem)
                
                if queue_item is None:
                    # No URLQueueItem available, wait a bit before checking again
                    await asyncio.sleep(1)
                    continue
                
                # logger.info(f"Retrieved URLQueueItem from queue: {queue_item.url.url}")
                
                # Process the URLQueueItem
                result = await self.process_url_queue_item(queue_item)
                
                should_sleep = True

                if result["status"] == "success":
                    logger.info(f"Successfully processed URL: {queue_item.url.url}")
                elif result["status"] == "deferred":
                    should_sleep = False
                elif result["status"] == "requeued":
                    logger.info(f"Re-queued URL: {queue_item.url.url} - {result.get('reason')}")
                elif result["status"] == "skipped":
                    logger.info(f"Skipped URL: {queue_item.url.url} - {result.get('reason')}")
                elif result["status"] == "dropped":
                    should_sleep = False
                    logger.info(f"Dropped URL: {queue_item.url.url} - {result.get('reason')}")
                else:
                    logger.error(f"Failed to process URL: {queue_item.url.url} - {result.get('error')}")
                
                # Sleep for 1 second between processing items
                asyncio.sleep(1) if should_sleep else asyncio.sleep(0)
                
            except KeyboardInterrupt:
                logger.info("Received interrupt signal, shutting down...")
                break
            except Exception as e:
                logger.error(f"Unexpected error in worker loop: {e}")
                await asyncio.sleep(1)  # Brief pause before retrying


async def main():
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    worker = ParsingWorker(redis_url)
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
