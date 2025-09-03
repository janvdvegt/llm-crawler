from __future__ import annotations
from typing import TypeVar
from pydantic import BaseModel
import orjson
from redis_utils import get_redis

from data_models import URL, URLPrefix


R = get_redis()

# --- models ---
T = TypeVar("T", bound=BaseModel)

def key(model_or_cls, id_: str) -> str:
    name = model_or_cls.__name__ if isinstance(model_or_cls, type) else model_or_cls.__class__.__name__
    return f"model:{name}:{id_}"

def save(model: BaseModel) -> None:
    k = key(model, model.id)
    R.set(k, orjson.dumps(model.model_dump(mode="json")))

def load(cls, id_: str):
    raw = R.get(key(cls, id_))
    return cls(**orjson.loads(raw)) if raw else None

def scan(cls) -> list[BaseModel]:
    keys = R.keys(key(cls, "*"))
    return [cls(**orjson.loads(R.get(key))) for key in keys]

def count(cls) -> int:
    return len(R.keys(key(cls, "*")))

def delete_all(cls) -> int:
    """Delete all instances of a model class from Redis. Returns the number of deleted items."""
    keys = R.keys(key(cls, "*"))
    if keys:
        R.delete(*keys)
    return len(keys)


def delete(cls, id_: str) -> bool:
    """Delete a specific model instance by its ID. Returns True if deleted, False if not found."""
    k = key(cls, id_)
    if R.exists(k):
        R.delete(k)
        return True
    return False


# Production config management
PRODUCTION_CONFIG_KEY = "production_config"

def get_production_config() -> str | None:
    """Get the current production config name"""
    return R.get(PRODUCTION_CONFIG_KEY).decode('utf-8') if R.get(PRODUCTION_CONFIG_KEY) else None

def set_production_config(config_name: str) -> None:
    """Set the current production config name"""
    R.set(PRODUCTION_CONFIG_KEY, config_name)

# System state management
SYSTEM_STATE_KEY = "system_state"

def get_system_state() -> str:
    """Get the current system state (PAUSE or RUNNING)"""
    state = R.get(SYSTEM_STATE_KEY)
    return state.decode('utf-8') if state else "RUNNING"  # Default to RUNNING

def set_system_state(state: str) -> None:
    """Set the system state to PAUSE or RUNNING"""
    if state not in ["PAUSE", "RUNNING"]:
        raise ValueError("State must be either 'PAUSE' or 'RUNNING'")
    R.set(SYSTEM_STATE_KEY, state)

def is_system_running() -> bool:
    """Check if the system is in RUNNING state"""
    return get_system_state() == "RUNNING"

def find_prefix_for_url(url: str) -> URLPrefix | None:
    """Find the prefix for a given URL by iteratively checking higher-level prefixes"""
    # Start with the full URL and progressively shorten it
    # This allows us to find the most specific prefix match
    url_parts = url.split('/')
    
    # Try progressively shorter prefixes
    for i in range(len(url_parts), 0, -1):
        potential_prefix = '/'.join(url_parts[:i])
        prefix_obj = load(URLPrefix, potential_prefix)
        if prefix_obj:
            return prefix_obj
    
    return None


def find_urls_with_prefix(prefix: str) -> list[URL]:
    """Find all URL objects in the database that have the given prefix"""
    all_urls = scan(URL)
    matching_urls = []
    
    for url_obj in all_urls:
        if url_obj.prefix == prefix:
            matching_urls.append(url_obj)
    
    return matching_urls
