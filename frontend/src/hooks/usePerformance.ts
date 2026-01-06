/**
 * 性能监控 Hook
 * 提供 FPS 监控、渲染性能监控、内存使用监控和组件渲染时间追踪
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  fps: number;              // 帧率
  avgFps: number;           // 平均帧率
  memoryUsage?: number;     // 内存使用量 (MB)
  memoryLimit?: number;     // 内存限制
  frameTime: number;        // 每帧时间
  droppedFrames: number;    // 掉帧数
}

/**
 * 组件渲染时间追踪结果
 */
export interface RenderTiming {
  componentName: string;
  renderTime: number;
  renderCount: number;
  avgRenderTime: number;
}

/**
 * FPS 监控 Hook
 * @param updateInterval 更新间隔(毫秒)
 */
export function useFpsMonitor(updateInterval: number = 1000) {
  const [fps, setFps] = useState<number>(0);
  const [avgFps, setAvgFps] = useState<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const frameTimesRef = useRef<number[]>([]);

  useEffect(() => {
    const updateFps = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      
      if (delta >= updateInterval) {
        const currentFps = Math.round((frameCountRef.current * 1000) / delta);
        
        // 记录帧时间
        frameTimesRef.current.push(currentFps);
        if (frameTimesRef.current.length > 60) {
          frameTimesRef.current.shift();
        }
        
        // 计算平均 FPS
        const avg = frameTimesRef.current.reduce((a, b) => a + b, 0) / 
                   frameTimesRef.current.length;
        
        setFps(currentFps);
        setAvgFps(Math.round(avg));
        
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
    };

    const measureFrame = () => {
      frameCountRef.current++;
      requestAnimationFrame(measureFrame);
    };

    const intervalId = setInterval(updateFps, updateInterval);
    measureFrame();

    return () => {
      clearInterval(intervalId);
    };
  }, [updateInterval]);

  return { fps, avgFps };
}

/**
 * 组件渲染时间追踪 Hook
 */
export function useRenderTiming(componentName: string) {
  const renderCountRef = useRef<number>(0);
  const renderTimesRef = useRef<number[]>([]);

  useEffect(() => {
    renderCountRef.current++;
  });

  const measureRender = useCallback<T extends (...args: any[]) => any>(
    fn: T
  ): T => {
    return ((...args: any[]) => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();
      
      const renderTime = end - start;
      renderTimesRef.current.push(renderTime);
      
      if (renderTimesRef.current.length > 100) {
        renderTimesRef.current.shift();
      }
      
      return result;
    }) as T;
  }, []);

  const getTiming = useCallback((): RenderTiming => {
    const avgRenderTime = renderTimesRef.current.length > 0
      ? renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length
      : 0;

    return {
      componentName,
      renderTime: renderTimesRef.current[renderTimesRef.current.length - 1] || 0,
      renderCount: renderCountRef.current,
      avgRenderTime
    };
  }, [componentName]);

  return { measureRender, getTiming };
}

/**
 * 内存使用监控 Hook
 */
export function useMemoryMonitor(updateInterval: number = 2000) {
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const [memoryLimit, setMemoryLimit] = useState<number>(0);
  const [memoryTrend, setMemoryTrend] = useState<'increasing' | 'decreasing' | 'stable'>('stable');

  useEffect(() => {
    if (!(performance as any).memory) {
      console.warn('内存监控不支持');
      return;
    }

    const intervalId = setInterval(() => {
      const mem = (performance as any).memory;
      const usedJSHeapSize = mem.usedJSHeapSize / (1024 * 1024); // MB
      const jsHeapSizeLimit = mem.jsHeapSizeLimit / (1024 * 1024); // MB

      setMemoryUsage(usedJSHeapSize);
      setMemoryLimit(jsHeapSizeLimit);

      // 简单的趋势检测
      // 这需要更复杂的实现来准确检测趋势
    }, updateInterval);

    return () => clearInterval(intervalId);
  }, [updateInterval]);

  // 强制垃圾回收（仅开发环境）
  const forceGarbageCollection = useCallback(() => {
    if (process.env.NODE_ENV === 'development' && window.gc) {
      window.gc();
    }
  }, []);

  return {
    memoryUsage,
    memoryLimit,
    memoryTrend,
    forceGarbageCollection,
    memoryUtilization: memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0
  };
}

/**
 * 完整的性能监控 Hook
 */
export function usePerformance(updateInterval: number = 1000) {
  const { fps, avgFps } = useFpsMonitor(updateInterval);
  const { memoryUsage, memoryLimit, forceGarbageCollection } = useMemoryMonitor(updateInterval);
  const [frameTime, setFrameTime] = useState<number>(0);
  const [droppedFrames, setDroppedFrames] = useState<number>(0);

  const lastFrameTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const checkFrameTime = (timestamp: number) => {
      const frameDuration = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;
      
      setFrameTime(frameDuration);
      
      // 检测掉帧（超过 16.67ms 即超过 60fps）
      if (frameDuration > 16.67) {
        setDroppedFrames(prev => prev + 1);
      }
      
      requestAnimationFrame(checkFrameTime);
    };

    requestAnimationFrame(checkFrameTime);
  }, []);

  // 重置统计
  const reset = useCallback(() => {
    setDroppedFrames(0);
  }, []);

  const metrics: PerformanceMetrics = {
    fps,
    avgFps,
    memoryUsage: memoryUsage || undefined,
    memoryLimit: memoryLimit || undefined,
    frameTime,
    droppedFrames
  };

  return {
    metrics,
    reset,
    forceGarbageCollection
  };
}

/**
 * 请求动画帧 Hook
 */
export function useAnimationFrame(
  callback: (timestamp: number) => void,
  deps: any[] = []
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    let rafId: number;

    const loop = (timestamp: number) => {
      callbackRef.current(timestamp);
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, deps);
}

/**
 * 性能优化的防抖 Hook
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;
}

/**
 * 性能优化的节流 Hook
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      lastCallRef.current = 0;
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      }
    },
    [callback, delay]
  ) as T;
}

/**
 * 懒加载图片性能监控 Hook
 */
export function useImageLoadPerformance() {
  const [loadTimes, setLoadTimes] = useState<number[]>([]);

  const trackImageLoad = useCallback((startTime: number) => {
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    setLoadTimes(prev => {
      const newLoadTimes = [...prev, loadTime];
      // 只保留最近的10次
      return newLoadTimes.slice(-10);
    });
    
    return loadTime;
  }, []);

  const getAverageLoadTime = useCallback(() => {
    if (loadTimes.length === 0) return 0;
    return loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
  }, [loadTimes]);

  return {
    trackImageLoad,
    getAverageLoadTime,
    loadTimes
  };
}

/**
 * 网络请求性能监控 Hook
 */
export function useNetworkPerformance() {
  const [requestTimes, setRequestTimes] = useState<{url: string, time: number}[]>([]);

  const trackRequest = useCallback((url: string, startTime: number) => {
    const endTime = performance.now();
    const requestTime = endTime - startTime;
    
    setRequestTimes(prev => {
      const newRequestTimes = [...prev, { url, time: requestTime }];
      return newRequestTimes.slice(-20); // 保留最近20次
    });
    
    return requestTime;
  }, []);

  const getAverageResponseTime = useCallback(() => {
    if (requestTimes.length === 0) return 0;
    return requestTimes.reduce((acc, req) => acc + req.time, 0) / requestTimes.length;
  }, [requestTimes]);

  return {
    trackRequest,
    getAverageResponseTime,
    requestTimes
  };
}