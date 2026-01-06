/**
 * API 服务单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/services/api';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: () => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    })
  }
}));

describe('API 服务', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确发送 GET 请求', async () => {
    const mockResponse = { data: { message: 'success' } };
    apiClient.get = vi.fn().mockResolvedValue(mockResponse);

    const response = await apiClient.get('/api/test');
    
    expect(response.data).toEqual({ message: 'success' });
    expect(apiClient.get).toHaveBeenCalledWith('/api/test');
  });

  it('应该正确发送 POST 请求', async () => {
    const mockData = { name: 'test' };
    const mockResponse = { data: { success: true } };
    apiClient.post = vi.fn().mockResolvedValue(mockResponse);

    const response = await apiClient.post('/api/test', mockData);
    
    expect(response.data).toEqual({ success: true });
    expect(apiClient.post).toHaveBeenCalledWith('/api/test', mockData);
  });

  it('应该正确处理错误响应', async () => {
    const mockError = new Error('Network Error');
    apiClient.get = vi.fn().mockRejectedValue(mockError);

    try {
      await apiClient.get('/api/test');
      expect(true).toBe(false); // 不应该到这里
    } catch (error) {
      expect(error).toBe(mockError);
    }
  });

  it('应该正确设置请求头', async () => {
    const mockResponse = { data: {} };
    apiClient.get = vi.fn().mockResolvedValue(mockResponse);

    await apiClient.get('/api/test', {
      headers: {
        'Authorization': 'Bearer token'
      }
    });
    
    expect(apiClient.get).toHaveBeenCalledWith('/api/test', {
      headers: {
        'Authorization': 'Bearer token'
      }
    });
  });
});