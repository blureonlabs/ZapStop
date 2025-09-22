import { useState, useEffect, useCallback } from 'react'
import { dataCache, cacheKeys, cacheTags } from '@/lib/dataCache'

interface ProgressiveDataState<T> {
  criticalData: T | null
  secondaryData: T | null
  criticalLoading: boolean
  secondaryLoading: boolean
  criticalError: string | null
  secondaryError: string | null
}

interface ProgressiveDataOptions {
  criticalTTL?: number
  secondaryTTL?: number
  criticalTags?: string[]
  secondaryTags?: string[]
  delaySecondary?: number // Delay in ms before loading secondary data
}

export function useProgressiveData<T, S>(
  criticalKey: string,
  criticalFetcher: () => Promise<T>,
  secondaryKey: string,
  secondaryFetcher: () => Promise<S>,
  options: ProgressiveDataOptions = {}
) {
  const {
    criticalTTL = 5 * 60 * 1000, // 5 minutes
    secondaryTTL = 10 * 60 * 1000, // 10 minutes
    criticalTags = [],
    secondaryTags = [],
    delaySecondary = 1000 // 1 second delay
  } = options

  const [state, setState] = useState<ProgressiveDataState<T>>({
    criticalData: null,
    secondaryData: null,
    criticalLoading: true,
    secondaryLoading: false,
    criticalError: null,
    secondaryError: null
  })

  const loadCriticalData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, criticalLoading: true, criticalError: null }))
      
      const data = await dataCache.getOrSet(
        criticalKey,
        criticalFetcher,
        criticalTTL,
        criticalTags
      )
      
      setState(prev => ({ 
        ...prev, 
        criticalData: data, 
        criticalLoading: false 
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        criticalError: error instanceof Error ? error.message : 'Failed to load critical data',
        criticalLoading: false 
      }))
    }
  }, [criticalKey, criticalFetcher, criticalTTL, criticalTags])

  const loadSecondaryData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, secondaryLoading: true, secondaryError: null }))
      
      const data = await dataCache.getOrSet(
        secondaryKey,
        secondaryFetcher,
        secondaryTTL,
        secondaryTags
      )
      
      setState(prev => ({ 
        ...prev, 
        secondaryData: data, 
        secondaryLoading: false 
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        secondaryError: error instanceof Error ? error.message : 'Failed to load secondary data',
        secondaryLoading: false 
      }))
    }
  }, [secondaryKey, secondaryFetcher, secondaryTTL, secondaryTags])

  const refetchCritical = useCallback(() => {
    dataCache.delete(criticalKey)
    loadCriticalData()
  }, [criticalKey, loadCriticalData])

  const refetchSecondary = useCallback(() => {
    dataCache.delete(secondaryKey)
    loadSecondaryData()
  }, [secondaryKey, loadSecondaryData])

  const refetchAll = useCallback(() => {
    refetchCritical()
    refetchSecondary()
  }, [refetchCritical, refetchSecondary])

  useEffect(() => {
    // Load critical data immediately
    loadCriticalData()
  }, [loadCriticalData])

  useEffect(() => {
    // Load secondary data after critical data is loaded and delay
    if (state.criticalData && !state.criticalLoading) {
      const timer = setTimeout(() => {
        loadSecondaryData()
      }, delaySecondary)

      return () => clearTimeout(timer)
    }
  }, [state.criticalData, state.criticalLoading, loadSecondaryData, delaySecondary])

  return {
    ...state,
    refetchCritical,
    refetchSecondary,
    refetchAll
  }
}

// Specialized hook for dashboard data
export function useDashboardProgressiveData(timeFilter: string) {
  return useProgressiveData(
    cacheKeys.dashboard(timeFilter),
    () => import('@/lib/edge-functions').then(module => module.dashboardAPI.getStats(timeFilter)),
    `dashboard:charts:${timeFilter}`,
    () => import('@/lib/edge-functions').then(module => module.dashboardAPI.getStats(timeFilter)),
    {
      criticalTTL: 5 * 60 * 1000, // 5 minutes
      secondaryTTL: 10 * 60 * 1000, // 10 minutes
      criticalTags: [cacheTags.dashboard],
      secondaryTags: [cacheTags.dashboard, 'charts'],
      delaySecondary: 500 // 500ms delay
    }
  )
}

// Hook for loading data in batches
export function useBatchData<T>(
  dataKeys: Array<{ key: string; fetcher: () => Promise<T>; ttl?: number; tags?: string[] }>,
  batchSize: number = 3
) {
  const [state, setState] = useState<{
    data: Map<string, T>
    loading: Map<string, boolean>
    errors: Map<string, string>
    completed: Set<string>
  }>({
    data: new Map(),
    loading: new Map(),
    errors: new Map(),
    completed: new Set()
  })

  const loadBatch = useCallback(async (startIndex: number) => {
    const batch = dataKeys.slice(startIndex, startIndex + batchSize)
    
    // Mark as loading
    setState(prev => {
      const newLoading = new Map(prev.loading)
      const newErrors = new Map(prev.errors)
      
      batch.forEach(({ key }) => {
        newLoading.set(key, true)
        newErrors.delete(key)
      })
      
      return { ...prev, loading: newLoading, errors: newErrors }
    })

    // Load data in parallel
    const promises = batch.map(async ({ key, fetcher, ttl, tags }) => {
      try {
        const data = await dataCache.getOrSet(key, fetcher, ttl, tags)
        
        setState(prev => {
          const newData = new Map(prev.data)
          const newLoading = new Map(prev.loading)
          const newCompleted = new Set(prev.completed)
          
          newData.set(key, data)
          newLoading.set(key, false)
          newCompleted.add(key)
          
          return { ...prev, data: newData, loading: newLoading, completed: newCompleted }
        })
      } catch (error) {
        setState(prev => {
          const newLoading = new Map(prev.loading)
          const newErrors = new Map(prev.errors)
          
          newLoading.set(key, false)
          newErrors.set(key, error instanceof Error ? error.message : 'Failed to load data')
          
          return { ...prev, loading: newLoading, errors: newErrors }
        })
      }
    })

    await Promise.all(promises)
  }, [dataKeys, batchSize])

  const loadAll = useCallback(async () => {
    for (let i = 0; i < dataKeys.length; i += batchSize) {
      await loadBatch(i)
      // Small delay between batches to prevent overwhelming the server
      if (i + batchSize < dataKeys.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }, [loadBatch, dataKeys.length, batchSize])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  return {
    data: state.data,
    loading: state.loading,
    errors: state.errors,
    completed: state.completed,
    refetch: loadAll
  }
}
