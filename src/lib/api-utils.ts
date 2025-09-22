// API utility functions for caching and performance optimization

export interface CacheHeaders {
  'Cache-Control': string
  'ETag'?: string
  'Last-Modified'?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Cache header configurations for different data types
export const CACHE_HEADERS = {
  // Static data (users, cars, owners) - cache for 15 minutes
  STATIC: {
    'Cache-Control': 'public, max-age=900, stale-while-revalidate=300'
  } as CacheHeaders,
  
  // Real-time data (earnings, expenses, attendance) - cache for 1 minute
  REAL_TIME: {
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=30'
  } as CacheHeaders,
  
  // Aggregated data (dashboard stats) - cache for 5 minutes
  AGGREGATED: {
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
  } as CacheHeaders,
  
  // No cache for sensitive operations
  NO_CACHE: {
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  } as CacheHeaders
}

// Generate ETag for data
export function generateETag(data: any): string {
  const str = JSON.stringify(data)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return `"${Math.abs(hash).toString(16)}"`
}

// Check if client has fresh data
export function isClientCacheFresh(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get('if-none-match')
  return ifNoneMatch === etag
}

// Calculate pagination parameters
export function calculatePagination(page: number = 1, limit: number = 20) {
  const normalizedPage = Math.max(1, page)
  const normalizedLimit = Math.min(100, Math.max(1, limit)) // Max 100 items per page
  const offset = (normalizedPage - 1) * normalizedLimit
  
  return {
    page: normalizedPage,
    limit: normalizedLimit,
    offset
  }
}

// Create paginated response
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit)
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }
}

// Add performance headers
export function addPerformanceHeaders(response: Response): Response {
  response.headers.set('X-Response-Time', Date.now().toString())
  response.headers.set('X-Cache-Status', 'MISS') // Will be updated by cache logic
  return response
}

// Database query optimization helpers
export function buildSelectQuery(
  table: string,
  fields: string[],
  filters: Record<string, any> = {},
  orderBy?: string,
  limit?: number,
  offset?: number
) {
  let query = `SELECT ${fields.join(', ')} FROM ${table}`
  
  const conditions: string[] = []
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        conditions.push(`${key} = ANY(${value})`)
      } else {
        conditions.push(`${key} = '${value}'`)
      }
    }
  })
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`
  }
  
  if (orderBy) {
    query += ` ORDER BY ${orderBy}`
  }
  
  if (limit) {
    query += ` LIMIT ${limit}`
  }
  
  if (offset) {
    query += ` OFFSET ${offset}`
  }
  
  return query
}
