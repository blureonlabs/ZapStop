// Enhanced in-memory cache for dashboard data with invalidation and warming
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
  tags?: string[] // Tags for cache invalidation
}

export interface AdminDashboardData {
  drivers: unknown[]
  cars: unknown[]
  owners: unknown[]
  earnings: unknown[]
  expenses: unknown[]
  attendance: unknown[]
}

class DataCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes
  private pendingRequests = new Map<string, Promise<any>>()

  set<T>(key: string, data: T, ttl: number = this.defaultTTL, tags?: string[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      tags
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
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

  // Cache invalidation by pattern
  invalidatePattern(pattern: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  // Cache invalidation by tags
  invalidateByTags(tags: string[]): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key)
      }
    }
  }

  // Cache warming with deduplication
  async warmCache<T>(key: string, fetcher: () => Promise<T>, ttl?: number, tags?: string[]): Promise<T> {
    // Check if already cached
    if (this.has(key)) {
      return this.get<T>(key)!
    }

    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!
    }

    // Create and store the promise
    const promise = fetcher().then(data => {
      this.set(key, data, ttl, tags)
      this.pendingRequests.delete(key)
      return data
    }).catch(error => {
      this.pendingRequests.delete(key)
      throw error
    })

    this.pendingRequests.set(key, promise)
    return promise
  }

  // Get or set with automatic fetching
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl?: number, tags?: string[]): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    return this.warmCache(key, fetcher, ttl, tags)
  }

  // Preload multiple keys
  async preload<T>(keys: Array<{ key: string; fetcher: () => Promise<T>; ttl?: number; tags?: string[] }>): Promise<void> {
    const promises = keys.map(({ key, fetcher, ttl, tags }) => 
      this.warmCache(key, fetcher, ttl, tags)
    )
    await Promise.all(promises)
  }

  // Get cache statistics
  getStats() {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0
    let totalSize = 0

    for (const [key, entry] of this.cache.entries()) {
      totalSize += JSON.stringify(entry.data).length
      if (now - entry.timestamp > entry.ttl) {
        expiredEntries++
      } else {
        validEntries++
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      pendingRequests: this.pendingRequests.size,
      estimatedSize: `${(totalSize / 1024).toFixed(2)} KB`
    }
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
    this.pendingRequests.clear()
  }

  delete(key: string): void {
    this.cache.delete(key)
    this.pendingRequests.delete(key)
  }
}

export const dataCache = new DataCache()

// Cache key generators
export const cacheKeys = {
  dashboard: (timeFilter: string) => `dashboard:${timeFilter}`,
  cars: (filters?: string) => `cars:${filters || 'all'}`,
  drivers: (filters?: string) => `drivers:${filters || 'all'}`,
  earnings: (driverId?: string, timeFilter?: string) => `earnings:${driverId || 'all'}:${timeFilter || 'all'}`,
  expenses: (driverId?: string, status?: string) => `expenses:${driverId || 'all'}:${status || 'all'}`,
  attendance: (driverId?: string, date?: string) => `attendance:${driverId || 'all'}:${date || 'all'}`,
}

// Cache tags for invalidation
export const cacheTags = {
  dashboard: 'dashboard',
  cars: 'cars',
  drivers: 'drivers',
  earnings: 'earnings',
  expenses: 'expenses',
  attendance: 'attendance',
  users: 'users',
} as const
