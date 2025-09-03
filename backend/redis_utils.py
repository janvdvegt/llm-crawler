import redis
import os


# --- connection (make a new client per process) ---
def get_redis(url: str = None) -> redis.Redis:
    if url is None:
        url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    return redis.Redis.from_url(url, decode_responses=False)


R = get_redis()
