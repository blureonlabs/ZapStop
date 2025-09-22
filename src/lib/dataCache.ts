// Enhanced in-memory cache for dashboard data with tiered caching
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
  priority: 'high' | 'medium' | 'low' // Cache priority for eviction
}

export interface AdminDashboardData {
  drivers: any[]
  cars: any[]
  owners: any[]
  earnings: any[]
  expenses: any[]
  attendance: any[]
}

// Cache TTL configurations for different data types
const CACHE_TTL = {
  REAL_TIME: 1 * 60 * 1000,      // 1 minute for real-time data
  STATIC: 15 * 60 * 1000,        // 15 minutes for static data
  AGGREGATED: 30 * 60 * 1000,    // 30 minutes for aggregated data
  USER_SESSION: 60 * 60 * 1000,  // 1 hour for user session data
} as const

class DataCache {
  private cache = new Map<string, CacheEntry<any>>()
  private maxSize = 100 // Maximum number of cache entries
  private defaultTTL = CACHE_TTL.STATIC

  set<T>(key: string, data: T, ttl: number = this.defaultTTL, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    // Evict old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldEntries()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      priority
    })
  }

  // Smart cache methods for different data types
  setRealTimeData<T>(key: string, data: T): void {
    this.set(key, data, CACHE_TTL.REAL_TIME, 'high')
  }

  setStaticData<T>(key: string, data: T): void {
    this.set(key, data, CACHE_TTL.STATIC, 'low')
  }

  setAggregatedData<T>(key: string, data: T): void {
    this.set(key, data, CACHE_TTL.AGGREGATED, 'medium')
  }

  setUserSessionData<T>(key: string, data: T): void {
    this.set(key, data, CACHE_TTL.USER_SESSION, 'high')
  }

  private evictOldEntries(): void {
    const entries = Array.from(this.cache.entries())
    
    // Sort by priority (low first) then by timestamp (oldest first)
    entries.sort((a, b) => {
      const priorityOrder = { low: 0, medium: 1, high: 2 }
      const priorityDiff = priorityOrder[a[1].priority] - priorityOrder[b[1].priority]
      if (priorityDiff !== 0) return priorityDiff
      return a[1].timestamp - b[1].timestamp
    })

    // Remove oldest 20% of entries
    const toRemove = Math.ceil(entries.length * 0.2)
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0])
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  clear(): void {
    this.cache.clear()
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  // Get cache statistics for monitoring
  getStats() {
    const entries = Array.from(this.cache.values())
    const now = Date.now()
    
    return {
      totalEntries: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses
      entriesByPriority: {
        high: entries.filter(e => e.priority === 'high').length,
        medium: entries.filter(e => e.priority === 'medium').length,
        low: entries.filter(e => e.priority === 'low').length,
      },
      expiredEntries: entries.filter(e => now - e.timestamp > e.ttl).length
    }
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

export const dataCache = new DataCache()

// Clean up expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    dataCache.cleanup()
  }, 5 * 60 * 1000)
}
