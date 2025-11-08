import { useState, useEffect, useRef, useCallback } from 'react';

interface VirtualScrollOptions {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualScrollResult {
  virtualItems: Array<{ index: number; start: number }>;
  totalHeight: number;
  scrollToBottom: () => void;
}

/**
 * Virtual scrolling hook for efficiently rendering large lists
 * Only renders items that are visible in the viewport plus overscan
 */
export function useVirtualScroll({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 5,
}: VirtualScrollOptions): VirtualScrollResult {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  // Generate virtual items
  const virtualItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({
      index: i,
      start: i * itemHeight,
    });
  }

  const totalHeight = itemCount * itemHeight;

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = totalHeight;
    }
  }, [totalHeight]);

  // Auto-scroll to bottom when new items are added
  useEffect(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }, [itemCount, scrollToBottom]);

  return {
    virtualItems,
    totalHeight,
    scrollToBottom,
  };
}

/**
 * Attach this to your scroll container
 */
export function useScrollHandler(onScroll: (scrollTop: number) => void) {
  return useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      onScroll(e.currentTarget.scrollTop);
    },
    [onScroll]
  );
}
