from __future__ import annotations
from typing import Optional, TypeVar
from pydantic import BaseModel
import orjson

from redis_utils import get_redis

T = TypeVar('T', bound=BaseModel)

R = get_redis()


def add_to_queue(model: BaseModel, queue_name: Optional[str] = None) -> bool:
    """
    Add a BaseModel instance to a queue in Redis.
    
    Args:
        model: The BaseModel instance to add to the queue
        queue_name: Optional custom queue name. If None, derived from model class name.
        
    Returns:
        bool: True if successfully added, False otherwise
    """
    try:
        # Auto-derive queue name from model class if not provided
        if queue_name is None:
            queue_name = f"queue:{model.__class__.__name__.lower()}"
        
        # Serialize the model to JSON
        serialized_data = orjson.dumps(model.model_dump())
        
        # Add to Redis list (queue)
        R.lpush(queue_name, serialized_data)
        return True
    except Exception as e:
        print(f"Error adding model to queue {queue_name}: {e}")
        return False


def get_from_queue(model_class: Type[T], queue_name: Optional[str] = None) -> Optional[T]:
    """
    Get a BaseModel instance from a queue in Redis.
    
    Args:
        model_class: The class of the BaseModel to deserialize
        queue_name: Optional custom queue name. If None, derived from model class name.
        
    Returns:
        Optional[T]: The deserialized model instance or None if queue is empty or error occurs
    """
    try:
        # Auto-derive queue name from model class if not provided
        if queue_name is None:
            queue_name = f"queue:{model_class.__name__.lower()}"
        
        # Get item from Redis list (queue) - pops from the right (FIFO)
        serialized_data = R.rpop(queue_name)
        
        if serialized_data is None:
            return None
            
        # Deserialize the JSON data
        data = orjson.loads(serialized_data)
        
        # Create model instance
        return model_class(**data)
    except Exception as e:
        print(f"Error getting model from queue {queue_name}: {e}")
        return None


def peek_from_queue(model_class: Type[T], queue_name: Optional[str] = None) -> Optional[T]:
    """
    Peek at a BaseModel instance from a queue without removing it.
    
    Args:
        model_class: The class of the BaseModel to deserialize
        queue_name: Optional custom queue name. If None, derived from model class name.
        
    Returns:
        Optional[T]: The deserialized model instance or None if queue is empty or error occurs
    """
    try:
        # Auto-derive queue name from model class if not provided
        if queue_name is None:
            queue_name = f"queue:{model_class.__name__.lower()}"
        
        # Get item from Redis list without removing it
        serialized_data = R.lindex(queue_name, -1)  # Get the rightmost item
        
        if serialized_data is None:
            return None
            
        # Deserialize the JSON data
        data = orjson.loads(serialized_data)
        
        # Create model instance
        return model_class(**data)
    except Exception as e:
        print(f"Error peeking model from queue {queue_name}: {e}")
        return None


def queue_length(queue_name: Optional[str] = None, model_class: Optional[Type[T]] = None) -> int:
    """
    Get the length of a queue.
    
    Args:
        queue_name: Optional custom queue name. If None, derived from model_class.
        model_class: Optional model class to derive queue name from if queue_name is None.
        
    Returns:
        int: The number of items in the queue
    """
    try:
        # Auto-derive queue name from model class if not provided
        if queue_name is None:
            if model_class is None:
                raise ValueError("Either queue_name or model_class must be provided")
            queue_name = f"queue:{model_class.__name__.lower()}"
        
        return R.llen(queue_name)
    except Exception as e:
        print(f"Error getting queue length for {queue_name}: {e}")
        return 0


def clear_queue(queue_name: Optional[str] = None, model_class: Optional[Type[T]] = None) -> bool:
    """
    Clear all items from a queue.
    
    Args:
        queue_name: Optional custom queue name. If None, derived from model_class.
        model_class: Optional model class to derive queue name from if queue_name is None.
        
    Returns:
        bool: True if successfully cleared, False otherwise
    """
    try:
        # Auto-derive queue name from model class if not provided
        if queue_name is None:
            if model_class is None:
                raise ValueError("Either queue_name or model_class must be provided")
            queue_name = f"queue:{model_class.__name__.lower()}"
        
        R.delete(queue_name)
        return True
    except Exception as e:
        print(f"Error clearing queue {queue_name}: {e}")
        return False
