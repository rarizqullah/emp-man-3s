import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import React from 'react'

interface VirtualScrollOptions {
  itemHeight: number
  containerHeight: number
  buffer?: number // Additional items to render outside viewport
  threshold?: number // Threshold for loading more items
}

interface VirtualScrollResult<T> {
  virtualItems: Array<{
    index: number
    item: T
    offsetTop: number
  }>
  totalHeight: number
  scrollToIndex: (index: number) => void
  isScrolling: boolean
}

// Hook untuk virtual scrolling
export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions
): VirtualScrollResult<T> {
  const {
    itemHeight,
    containerHeight,
    buffer = 5,
    threshold = 10
  } = options

  const [scrollTop, setScrollTop] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLElement>()

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer
    )
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, buffer, items.length])

  // Generate virtual items
  const virtualItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange
    const result = []

    for (let i = startIndex; i <= endIndex; i++) {
      if (items[i]) {
        result.push({
          index: i,
          item: items[i],
          offsetTop: i * itemHeight
        })
      }
    }

    return result
  }, [visibleRange, items, itemHeight])

  // Total height for scrollbar
  const totalHeight = items.length * itemHeight

  // Scroll handler
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement
    setScrollTop(target.scrollTop)

    // Set scrolling state
    setIsScrolling(true)
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, 150)
  }, [])

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      const scrollTop = index * itemHeight
      containerRef.current.scrollTop = scrollTop
      setScrollTop(scrollTop)
    }
  }, [itemHeight])

  // Setup scroll listener
  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
      return () => {
        container.removeEventListener('scroll', handleScroll)
      }
    }
  }, [handleScroll])

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  return {
    virtualItems,
    totalHeight,
    scrollToIndex,
    isScrolling
  }
}

// Hook untuk infinite scroll dengan cursor-based pagination
export function useInfiniteScroll<T>(
  fetchMore: (cursor?: string) => Promise<{
    items: T[]
    nextCursor?: string
    hasMore: boolean
  }>,
  options: {
    threshold?: number
    enabled?: boolean
    initialCursor?: string
  } = {}
) {
  const {
    threshold = 200,
    enabled = true,
    initialCursor
  } = options

  const [items, setItems] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | undefined>(initialCursor)
  const [error, setError] = useState<string | null>(null)

  const observerRef = useRef<IntersectionObserver>()
  const loadingRef = useRef<HTMLDivElement>(null)

  // Load more data
  const loadMore = useCallback(async () => {
    if (!enabled || isLoading || !hasMore) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchMore(cursor)
      
      setItems(prev => [...prev, ...result.items])
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more data')
    } finally {
      setIsLoading(false)
    }
  }, [cursor, enabled, isLoading, hasMore, fetchMore])

  // Setup intersection observer
  useEffect(() => {
    if (!enabled || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    observerRef.current = observer

    if (loadingRef.current) {
      observer.observe(loadingRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [enabled, hasMore, loadMore])

  // Reset data
  const reset = useCallback(() => {
    setItems([])
    setCursor(initialCursor)
    setHasMore(true)
    setError(null)
  }, [initialCursor])

  // Ref untuk intersection observer
  const lastItemRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return
    if (observerRef.current) observerRef.current.disconnect()
    if (node) {
      observerRef.current?.observe(node)
    }
  }, [isLoading])

  return {
    items,
    isLoading,
    hasMore,
    error,
    loadMore,
    reset,
    lastItemRef,
    loadingRef
  }
}

// Hook untuk smart pagination dengan caching
export function useSmartPagination<T>(
  fetchPage: (page: number, pageSize: number) => Promise<{
    items: T[]
    total: number
    hasMore: boolean
  }>,
  options: {
    pageSize?: number
    maxCachedPages?: number
    prefetchNext?: boolean
  } = {}
) {
  const {
    pageSize = 20,
    maxCachedPages = 5,
    prefetchNext = true
  } = options

  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cache untuk menyimpan hasil page
  const cacheRef = useRef(new Map<number, {
    items: T[]
    total: number
    hasMore: boolean
    timestamp: number
  }>())

  // Get cached page atau fetch baru
  const getPage = useCallback(async (page: number) => {
    const cached = cacheRef.current.get(page)
    
    // Return cached jika masih fresh (< 5 menit)
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached
    }

    // Fetch page baru
    const result = await fetchPage(page, pageSize)
    
    // Cache result
    cacheRef.current.set(page, {
      ...result,
      timestamp: Date.now()
    })

    // Cleanup old cache
    if (cacheRef.current.size > maxCachedPages) {
      const oldestPage = Array.from(cacheRef.current.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0]
      cacheRef.current.delete(oldestPage[0])
    }

    return result
  }, [fetchPage, pageSize, maxCachedPages])

  // Load specific page
  const loadPage = useCallback(async (page: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getPage(page)
      setCurrentPage(page)

      // Prefetch next page
      if (prefetchNext && result.hasMore) {
        setTimeout(() => {
          getPage(page + 1).catch(() => {
            // Silent fail for prefetch
          })
        }, 100)
      }

      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load page')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [getPage, prefetchNext])

  // Navigation functions
  const goToPage = useCallback((page: number) => {
    return loadPage(page)
  }, [loadPage])

  const nextPage = useCallback(() => {
    return loadPage(currentPage + 1)
  }, [loadPage, currentPage])

  const prevPage = useCallback(() => {
    return loadPage(Math.max(1, currentPage - 1))
  }, [loadPage, currentPage])

  // Get current page data
  const currentData = cacheRef.current.get(currentPage)

  // Clear cache
  const clearCache = useCallback(() => {
    cacheRef.current.clear()
  }, [])

  return {
    currentPage,
    currentData: currentData || { items: [], total: 0, hasMore: false },
    isLoading,
    error,
    goToPage,
    nextPage,
    prevPage,
    loadPage,
    clearCache,
    cacheSize: cacheRef.current.size
  }
}

// Hook untuk hybrid virtual + infinite scroll
export function useVirtualInfiniteScroll<T>(
  fetchMore: (cursor?: string) => Promise<{
    items: T[]
    nextCursor?: string
    hasMore: boolean
  }>,
  virtualOptions: Omit<VirtualScrollOptions, 'containerHeight'>,
  infiniteOptions?: Parameters<typeof useInfiniteScroll>[1]
) {
  const [containerHeight, setContainerHeight] = useState(400)
  const containerRef = useRef<HTMLDivElement>(null)

  // Get container height
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight)
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  const infinite = useInfiniteScroll(fetchMore, infiniteOptions)
  const virtual = useVirtualScroll(infinite.items, {
    ...virtualOptions,
    containerHeight
  })

  // Trigger load more when near end
  useEffect(() => {
    const { virtualItems } = virtual
    const lastVisibleIndex = virtualItems[virtualItems.length - 1]?.index || 0
    
    if (
      infinite.hasMore &&
      !infinite.isLoading &&
      lastVisibleIndex > infinite.items.length - 10
    ) {
      infinite.loadMore()
    }
  }, [virtual.virtualItems, infinite])

  return {
    ...infinite,
    ...virtual,
    containerRef
  }
}

// Utility untuk optimized list rendering
export function OptimizedList<T>({
  items,
  renderItem,
  itemHeight,
  height,
  className,
  emptyMessage = 'No items found'
}: {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  itemHeight: number
  height: number
  className?: string
  emptyMessage?: string
}) {
  const virtual = useVirtualScroll(items, {
    itemHeight,
    containerHeight: height
  })

  if (items.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center ${className || ''}`}
        style={{ height }}
      >
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div 
      className={`overflow-auto ${className || ''}`}
      style={{ height }}
    >
      <div style={{ height: virtual.totalHeight, position: 'relative' }}>
        {virtual.virtualItems.map(virtualItem => (
          <div
            key={virtualItem.index}
            style={{
              position: 'absolute',
              top: virtualItem.offsetTop,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(virtualItem.item, virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  )
} 