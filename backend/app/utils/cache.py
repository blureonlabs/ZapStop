"""
Caching utilities
"""

import json
from typing import Any, Optional
from app.database import get_redis

class CacheManager:
    def __init__(self):
        self.redis = get_redis()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            value = self.redis.get(key)
            return json.loads(value) if value else None
        except Exception:
            return None
    
    def set(self, key: str, value: Any, expire: int = 3600) -> bool:
        """Set value in cache"""
        try:
            self.redis.setex(key, expire, json.dumps(value))
            return True
        except Exception:
            return False
    
    def delete(self, key: str) -> bool:
        """Delete value from cache"""
        try:
            self.redis.delete(key)
            return True
        except Exception:
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            return self.redis.exists(key) > 0
        except Exception:
            return False

# Global cache manager instance
cache_manager = CacheManager()
