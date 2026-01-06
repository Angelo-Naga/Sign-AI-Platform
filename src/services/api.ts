/**
 * API基础配置文件
 * 提供统一的HTTP客户端和API请求配置
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { toast } from 'react-hot-toast';
import type { ApiResponse, ApiError } from '../types/api';

/**
 * API基础配置
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_TIMEOUT = 30000; // 30秒超时

/**
 * 创建Axios实例
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 请求拦截器
 * 在发送请求前添加认证令牌等配置
 */
apiClient.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 添加请求ID用于追踪
    config.headers['X-Request-ID'] = generateRequestId();
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器
 * 统一处理响应和错误
 */
apiClient.interceptors.response.use(
  <T>(response: AxiosResponse<ApiResponse<T>>): T => {
    const { data } = response;
    
    // 检查业务状态
    if (!data.success) {
      const error: ApiError = {
        code: 'BUSINESS_ERROR',
        message: data.message || '业务处理失败',
        status: response.status,
      };
      return Promise.reject(error);
    }
    
    return data.data;
  },
  (error: AxiosError<ApiResponse>): Promise<never> => {
    let apiError: ApiError;
    
    if (error.response) {
      // 服务器响应了但状态码不在2xx范围内
      const { data, status } = error.response;
      apiError = {
        code: data?.code || 'HTTP_ERROR',
        message: data?.message || statusToMessage(status),
        status,
        details: data?.details,
      };
      
      // 特殊状态码处理
      if (status === 401) {
        // 未授权，清除token并跳转登录
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      } else if (status === 403) {
        toast.error('没有权限访问此资源');
      } else if (status === 404) {
        toast.error('请求的资源不存在');
      } else if (status >= 500) {
        toast.error('服务器内部错误，请稍后重试');
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      apiError = {
        code: 'NETWORK_ERROR',
        message: '网络连接失败，请检查网络设置',
      };
      toast.error(apiError.message);
    } else {
      // 请求配置错误
      apiError = {
        code: 'REQUEST_ERROR',
        message: error.message || '请求配置错误',
      };
    }
    
    return Promise.reject(apiError);
  }
);

/**
 * 生成唯一的请求ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * HTTP状态码转错误消息
 */
function statusToMessage(status: number): string {
  const messages: Record<number, string> = {
    400: '请求参数错误',
    401: '未授权访问',
    403: '权限不足',
    404: '资源不存在',
    405: '请求方法不允许',
    409: '资源冲突',
    422: '数据验证失败',
    429: '请求过于频繁',
    500: '服务器内部错误',
    502: '网关错误',
    503: '服务暂不可用',
    504: '网关超时',
  };
  
  return messages[status] || '未知错误';
}

/**
 * 通用API请求方法
 */
export const api = {
  /**
   * GET请求
   */
  get: <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.get<T>(url, config);
  },

  /**
   * POST请求
   */
  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.post<T>(url, data, config);
  },

  /**
   * PUT请求
   */
  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.put<T>(url, data, config);
  },

  /**
   * PATCH请求
   */
  patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.patch<T>(url, data, config);
  },

  /**
   * DELETE请求
   */
  delete: <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.delete<T>(url, config);
  },

  /**
   * 上传文件
   */
  upload: <T = unknown>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiClient.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          onProgress(progress);
        }
      },
    });
  },
};

/**
 * 健康检查
 */
export const healthCheck = async () => {
  try {
    return await api.get('/health');
  } catch (error) {
    console.error('Health check failed:', error);
    return null;
  }
};

/**
 * 获取设备列表（摄像头和麦克风）
 */
export const getDevices = async () => {
  return await api.get('/api/devices');
};

export default api;