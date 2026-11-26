# [file name]: cache_manager.py
import time
from typing import Dict, Any, Optional

class CacheManager:
    """Менеджер кэширования для оптимизации производительности"""
    
    def __init__(self, default_ttl: int = 300):  # 5 минут по умолчанию
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Добавить значение в кэш"""
        self.cache[key] = {
            'value': value,
            'expires': time.time() + (ttl or self.default_ttl)
        }
    
    def get(self, key: str) -> Optional[Any]:
        """Получить значение из кэша"""
        if key in self.cache:
            item = self.cache[key]
            if time.time() < item['expires']:
                return item['value']
            else:
                del self.cache[key]  # Удалить просроченный кэш
        return None
    
    def delete(self, key: str):
        """Удалить значение из кэша"""
        if key in self.cache:
            del self.cache[key]
    
    def clear(self):
        """Очистить весь кэш"""
        self.cache.clear()
    
    def get_or_compute(self, key: str, compute_func, ttl: Optional[int] = None):
        """Получить из кэша или вычислить и сохранить"""
        cached = self.get(key)
        if cached is not None:
            return cached
        
        result = compute_func()
        self.set(key, result, ttl)
        return result

class SearchCache:
    """Специализированный кэш для поисковых запросов"""
    
    def __init__(self):
        self.cache_manager = CacheManager(default_ttl=600)  # 10 минут для поиска
        self.max_cache_size = 100
    
    def get_search_results(self, query: str, apps_list):
        """Получить кэшированные результаты поиска"""
        cache_key = f"search_{query.lower().strip()}"
        
        def compute_results():
            return [app for app in apps_list 
                   if query in app["name"].lower() or query in app["category"].lower()]
        
        return self.cache_manager.get_or_compute(cache_key, compute_results)
    
    def invalidate_search_cache(self):
        """Сбросить кэш поиска (при изменении списка приложений)"""
        keys_to_delete = [key for key in self.cache_manager.cache.keys() if key.startswith("search_")]
        for key in keys_to_delete:
            self.cache_manager.delete(key)