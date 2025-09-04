// Simple performance monitoring utilities

export class PerformanceMonitor {
  private static timers = new Map<string, number>()

  static startTimer(label: string): void {
    this.timers.set(label, performance.now())
  }

  static endTimer(label: string): number {
    const startTime = this.timers.get(label)
    if (!startTime) {
      console.warn(`Timer '${label}' was not started`)
      return 0
    }
    
    const duration = performance.now() - startTime
    this.timers.delete(label)
    
    // Log slow operations (> 1 second)
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`)
    }
    
    return duration
  }

  static measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.startTimer(label)
    return fn().finally(() => {
      this.endTimer(label)
    })
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
