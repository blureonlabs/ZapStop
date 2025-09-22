'use client'

import { useEffect } from 'react'

export default function PerformanceMonitor() {
  useEffect(() => {
    // Monitor Core Web Vitals
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Measure First Contentful Paint (FCP)
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            console.log(`${entry.name}: ${entry.startTime.toFixed(2)}ms`)
            
            // Send to analytics (replace with your analytics service)
            if (entry.name === 'first-contentful-paint') {
              console.log('FCP:', entry.startTime.toFixed(2), 'ms')
            }
          }
        }
      })
      
      observer.observe({ entryTypes: ['paint'] })

      // Measure Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        console.log('LCP:', lastEntry.startTime.toFixed(2), 'ms')
      })
      
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

      // Measure Cumulative Layout Shift (CLS)
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        }
        console.log('CLS:', clsValue.toFixed(4))
      })
      
      clsObserver.observe({ entryTypes: ['layout-shift'] })

      // Measure First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log('FID:', entry.processingStart - entry.startTime, 'ms')
        }
      })
      
      fidObserver.observe({ entryTypes: ['first-input'] })

      // Measure Time to Interactive (TTI)
      const ttiObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const tti = entry.loadEventEnd - entry.navigationStart
            console.log('TTI:', tti.toFixed(2), 'ms')
          }
        }
      })
      
      ttiObserver.observe({ entryTypes: ['navigation'] })

      // Monitor resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming
            if (resource.duration > 1000) { // Log slow resources (>1s)
              console.warn('Slow resource:', resource.name, resource.duration.toFixed(2), 'ms')
            }
          }
        }
      })
      
      resourceObserver.observe({ entryTypes: ['resource'] })

      // Cleanup observers on unmount
      return () => {
        observer.disconnect()
        lcpObserver.disconnect()
        clsObserver.disconnect()
        fidObserver.disconnect()
        ttiObserver.disconnect()
        resourceObserver.disconnect()
      }
    }
  }, [])

  return null // This component doesn't render anything
}

// Hook for measuring component performance
export function usePerformanceMeasure(componentName: string) {
  useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      if (duration > 100) { // Log slow components (>100ms)
        console.warn(`Slow component render: ${componentName} took ${duration.toFixed(2)}ms`)
      } else {
        console.log(`Component render: ${componentName} took ${duration.toFixed(2)}ms`)
      }
    }
  }, [componentName])
}

// Hook for measuring API call performance
export function useAPIPerformance() {
  const measureAPICall = async <T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<T> => {
    const startTime = performance.now()
    
    try {
      const result = await apiCall()
      const endTime = performance.now()
      const duration = endTime - startTime
      
      console.log(`API call ${endpoint}: ${duration.toFixed(2)}ms`)
      
      if (duration > 2000) { // Log slow API calls (>2s)
        console.warn(`Slow API call: ${endpoint} took ${duration.toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime
      console.error(`API call failed ${endpoint}: ${duration.toFixed(2)}ms`, error)
      throw error
    }
  }
  
  return { measureAPICall }
}
