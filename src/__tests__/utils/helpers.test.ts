/**
 * 工具函数单元测试
 */

import { describe, it, expect } from 'vitest';
import { formatTime, formatFileSize, debounce, throttle } from '@/utils/helpers';

describe('工具函数', () => {
  describe('formatTime', () => {
    it('应该正确格式化秒数为时间字符串', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(60)).toBe('01:00');
      expect(formatTime(3661)).toBe('01:01:01');
      expect(formatTime(123456)).toBe('34:17:36');
    });

    it('应该正确处理小数秒', () => {
      expect(formatTime(1.5)).toBe('00:01');
      expect(formatTime(60.9)).toBe('01:00');
    });

    it('应该正确处理负数', () => {
      expect(formatTime(-10)).toBe('00:00');
    });
  });

  describe('formatFileSize', () => {
    it('应该正确格式化字节为易读的字符串', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('应该正确格式化小数值', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1536 * 1024)).toBe('1.5 MB');
    });

    it('应该正确处理大数值', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 2)).toBe('2 GB');
    });
  });

  describe('debounce', () => {
    it('应该正确延迟函数调用', async () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该正确取消前面的调用', async () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    it('应该正确限制函数调用频率', async () => {
      const fn = jest.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(fn).toHaveBeenCalledTimes(1);

      await new Promise(resolve => setTimeout(resolve, 150));

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('应该正确控制调用间隔', async () => {
      const fn = jest.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      await new Promise(resolve => setTimeout(resolve, 50));
      throttledFn();

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});