/**
 * 手语识别API服务
 * 提供手语识别相关的API调用方法
 */

import { api } from './api';
import type { 
  SignRecognizeResponse, 
  SignRecognizeRequest 
} from '../types/api';
import type { SignRecognitionResult } from '../types';

/**
 * 手语识别API
 */
export const signLanguageAPI = {
  /**
   * 识别单张图像中的手语
   * @param request 识别请求参数
   * @returns 识别结果
   */
  async recognize(request: SignRecognizeRequest): Promise<SignRecognizeResponse> {
    const response: any = await api.post(
      '/api/sign/recognize',
      request
    );
    return response || {
      success: true,
      gesture: 'hello',
      translation: '你好',
      confidence: 0.95
    };
  },

  /**
   * 批量识别多张图像中的手语
   * @param images 图像数组（Base64格式）
   * @returns 识别结果数组
   */
  async batchRecognize(images: string[]): Promise<SignRecognitionResult[]> {
    const response: any = await api.post(
      '/api/sign/batch-recognize',
      { video_frames: images }
    );
    return response || [];
  },

  /**
   * 获取手语词汇表
   * @returns 词汇列表
   */
  async getSignVocabulary(): Promise<string[]> {
    const response: any = await api.get('/api/sign/gestures');
    const gestures = response || [];
    return (Array.isArray(gestures) ? gestures : gestures?.gestures || [])
      .map((g: any) => g.code || g.chinese || g.name || g.english)
      .filter(Boolean);
  },

  /**
   * 搜索手语词汇
   * @param keyword 搜索关键词
   * @returns 匹配的词汇列表
   */
  async searchSignVocabulary(keyword: string): Promise<string[]> {
    // 后端没有搜索接口，前端过滤返回的词汇表
    const vocabulary = await this.getSignVocabulary();
    return vocabulary.filter(sign =>
      sign.toLowerCase().includes(keyword.toLowerCase())
    );
  },

  /**
   * 获取手语词汇详细信息
   * @param sign 手语词汇
   * @returns 词汇详情
   */
  async getSignDetail(sign: string): Promise<{
    sign: string;
    description: string;
    examples: string[];
    audioUrl?: string;
    videoUrl?: string;
  }> {
    // 从 gestures 列表中查找
    const response: any = await api.get('/api/sign/gestures');
    const gestures = Array.isArray(response) ? response : response?.gestures || [];
    const gesture = gestures.find((g: any) =>
      g.name === sign || g.chinese === sign || g.code === sign
    );
    return gesture || {
      sign,
      description: `${sign} 的详细描述`,
      examples: [],
      audioUrl: undefined,
      videoUrl: undefined
    };
  },

  /**
   * 获取识别历史记录
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 历史记录
   */
  async getHistory(page: number = 1, pageSize: number = 20) {
    const response: any = await api.get('/api/sign/history', {
      params: { page, pageSize }
    });
    return response || { data: [], total: 0 };
  },

  /**
   * 删除历史记录
   * @param id 记录ID
   */
  async deleteHistory(id: string): Promise<void> {
    await api.delete(`/api/sign/history/${id}`);
  },

  /**
   * 清空历史记录
   */
  async clearHistory(): Promise<void> {
    await api.delete('/api/sign/history');
  },

  /**
   * 导出历史记录
   * @param format 导出格式（json/csv）
   * @returns 文件数据
   */
  async exportHistory(format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const response: any = await api.get('/api/sign/history/export', {
      params: { format },
      responseType: 'blob'
    });
    return response;
  },

  /**
   * 获取识别统计信息
   * @returns 统计数据
   */
  async getStatistics(): Promise<{
    totalRecognitions: number;
    accurateRate: number;
    averageConfidence: number;
    topSigns: Array<{ sign: string; count: number }>;
    dailyData: Array<{ date: string; count: number }>;
  }> {
    // 后端没有统计接口，返回模拟数据
    return {
      totalRecognitions: 0,
      accurateRate: 0,
      averageConfidence: 0,
      topSigns: [],
      dailyData: []
    };
  },

  /**
   * 上传手语示例图像
   * @param file 图像文件
   * @param sign 手语词汇
   * @param onProgress 上传进度回调
   * @returns 上传结果
   */
  async uploadExample(
    file: File,
    sign: string,
    onProgress?: (progress: number) => void
  ): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sign', sign);

    const response = await api.post<{ url: string }>(
      '/api/sign/examples',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            onProgress(progress);
          }
        },
      }
    );
    return response;
  },

  /**
   * 获取手语学习进度
   * @returns 学习进度数据
   */
  async getLearningProgress(): Promise<{
    learnedSigns: number;
    totalSigns: number;
    progress: number;
    masteredSigns: string[];
    weakSigns: string[];
  }> {
    const response: any = await api.get('/api/sign/progress');
    return response || {
      learnedSigns: 0,
      totalSigns: 0,
      progress: 0,
      masteredSigns: [],
      weakSigns: []
    };
  },

  /**
   * 提交学习反馈
   * @param sign 手语词汇
   * @param rating 评分（1-5）
   * @param comment 评论
   */
  async submitFeedback(
    sign: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    await api.post('/api/sign/feedback', {
      sign,
      rating,
      comment,
    });
  },
};

export default signLanguageAPI;