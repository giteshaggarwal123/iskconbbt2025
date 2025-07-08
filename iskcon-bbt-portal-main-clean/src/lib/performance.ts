// Performance optimization utilities
import { logger } from './utils';

// Debounce function for search inputs
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for scroll events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Memoization utility
export const memoize = <T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T => {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

// Lazy loading utility
export const lazyLoad = <T>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: T
): (() => Promise<T>) => {
  let cached: T | null = null;
  
  return async () => {
    if (cached) {
      return cached;
    }
    
    try {
      const module = await importFunc();
      cached = module.default;
      return cached;
    } catch (error) {
      logger.error('Lazy loading failed:', error);
      if (fallback) {
        return fallback;
      }
      throw error;
    }
  };
};

// Virtual scrolling helper
export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  totalItems: number;
  overscan?: number;
}

export interface VirtualScrollResult {
  startIndex: number;
  endIndex: number;
  visibleItems: number[];
  totalHeight: number;
  offsetY: number;
}

export const calculateVirtualScroll = (
  scrollTop: number,
  config: VirtualScrollConfig
): VirtualScrollResult => {
  const { itemHeight, containerHeight, totalItems, overscan = 5 } = config;
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  const visibleItems = Array.from(
    { length: endIndex - startIndex + 1 },
    (_, i) => startIndex + i
  );
  
  return {
    startIndex,
    endIndex,
    visibleItems,
    totalHeight: totalItems * itemHeight,
    offsetY: startIndex * itemHeight,
  };
};

// Image lazy loading
export const lazyLoadImage = (src: string, placeholder?: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve(src);
    img.onerror = () => {
      if (placeholder) {
        resolve(placeholder);
      } else {
        reject(new Error(`Failed to load image: ${src}`));
      }
    };
    
    img.src = src;
  });
};

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  startTimer(label: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      const existing = this.metrics.get(label) || [];
      existing.push(duration);
      this.metrics.set(label, existing);
      
      if (duration > 100) { // Log slow operations
        logger.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
      }
    };
  }
  
  getMetrics(label?: string): Record<string, number[]> | number[] {
    if (label) {
      return this.metrics.get(label) || [];
    }
    
    const result: Record<string, number[]> = {};
    for (const [key, value] of this.metrics.entries()) {
      result[key] = value;
    }
    return result;
  }
  
  getAverageTime(label: string): number {
    const times = this.metrics.get(label) || [];
    if (times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }
  
  clearMetrics(): void {
    this.metrics.clear();
  }
}

// Memory usage monitoring
export const getMemoryUsage = (): {
  used: number;
  total: number;
  percentage: number;
} => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
    };
  }
  
  return { used: 0, total: 0, percentage: 0 };
};

// Bundle size optimization helper
export const chunkSizeWarning = (size: number, threshold: number = 500): void => {
  if (size > threshold * 1024) {
    logger.warn(`Large bundle detected: ${(size / 1024).toFixed(2)}KB`);
  }
}; 