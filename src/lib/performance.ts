// Enhanced performance monitoring utilities

interface PerformanceMetric {
  label: string
  duration: number
  timestamp: number
  type: 'operation' | 'render' | 'api' | 'database'
  metadata?: Record<string, any>
}

export class PerformanceMonitor {
  private static timers = new Map<string, number>()
  private static metrics: PerformanceMetric[] = []
  private static maxMetrics = 1000 // Keep last 1000 metrics

  static startTimer(label: string): void {
    this.timers.set(label, performance.now())
  }

  static endTimer(label: string, type: PerformanceMetric['type'] = 'operation', metadata?: Record<string, any>): number {
    const startTime = this.timers.get(label)
    if (!startTime) {
      console.warn(`Timer '${label}' was not started`)
      return 0
    }
    
    const duration = performance.now() - startTime
    this.timers.delete(label)
    
    // Store metric
    this.recordMetric({
      label,
      duration,
      timestamp: Date.now(),
      type,
      metadata
    })
    
    // Log slow operations (> 1 second)
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`, metadata)
    }
    
    return duration
  }

  static measureAsync<T>(label: string, fn: () => Promise<T>, type: PerformanceMetric['type'] = 'operation', metadata?: Record<string, any>): Promise<T> {
    this.startTimer(label)
    return fn().finally(() => {
      this.endTimer(label, type, metadata)
    })
  }

  static recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric)
    
    // Keep only the last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  static getMetrics(type?: PerformanceMetric['type']): PerformanceMetric[] {
    if (type) {
      return this.metrics.filter(m => m.type === type)
    }
    return [...this.metrics]
  }

  static getSlowOperations(threshold: number = 1000): PerformanceMetric[] {
    return this.metrics.filter(m => m.duration > threshold)
  }

  static getAverageTime(label: string): number {
    const matchingMetrics = this.metrics.filter(m => m.label === label)
    if (matchingMetrics.length === 0) return 0
    
    const total = matchingMetrics.reduce((sum, m) => sum + m.duration, 0)
    return total / matchingMetrics.length
  }

  static getPerformanceReport(): {
    totalOperations: number
    averageTime: number
    slowOperations: PerformanceMetric[]
    byType: Record<string, { count: number; averageTime: number }>
  } {
    const totalOperations = this.metrics.length
    const averageTime = totalOperations > 0 
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations 
      : 0
    
    const slowOperations = this.getSlowOperations()
    
    const byType = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.type]) {
        acc[metric.type] = { count: 0, totalTime: 0 }
      }
      acc[metric.type].count++
      acc[metric.type].totalTime += metric.duration
      return acc
    }, {} as Record<string, { count: number; totalTime: number }>)

    // Calculate averages
    Object.keys(byType).forEach(type => {
      byType[type].averageTime = byType[type].totalTime / byType[type].count
      delete byType[type].totalTime
    })

    return {
      totalOperations,
      averageTime,
      slowOperations,
      byType
    }
  }

  static clearMetrics(): void {
    this.metrics = []
  }
}

// Hook for measuring component render times
export function usePerformanceMonitor(componentName: string) {
  const startTime = performance.now()
  
  return {
    endRender: () => {
      const duration = performance.now() - startTime
      if (duration > 100) { // Log renders > 100ms
        console.warn(`Slow render detected: ${componentName} took ${duration.toFixed(2)}ms`)
      }
    }
  }
}
