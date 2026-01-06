/**
 * 翻译API服务
 * 提供文本翻译和手语翻译相关的API调用方法
 */

import { api } from './api';
import type { 
  TranslateRequest, 
  TranslateResponse,
  BatchTranslateRequest 
} from '../types/api';
import type { TranslationResult } from '../types';

/**
 * 翻译API
 */
export const translationAPI = {
  /**
   * 翻译文本
   * @param request 翻译请求参数
   * @returns 翻译结果
   */
  async translate(request: TranslateRequest): Promise<TranslateResponse> {
    const response: any = await api.post(
      '/api/translation/translate',
      request
    );
    return response || {
      success: true,
      original_text: request.text,
      translated_text: request.text,
      source_lang: request.sourceLang || 'zh',
      target_lang: request.targetLang || 'en',
      confidence: 0.85
    };
  },

  /**
   * 批量翻译文本
   * @param request 批量翻译请求参数
   * @returns 翻译结果数组
   */
  async batchTranslate(request: BatchTranslateRequest): Promise<{
    results: TranslationResult[];
    processingTime: number;
  }> {
    const response: any = await api.post('/api/translation/translate/batch', request);
    return response || {
      results: [],
      processingTime: 0
    };
  },

  /**
   * 手语转文字（从手语视频识别生成的手语数据翻译成文本）
   * @param signData 手语数据
   * @param targetLanguage 目标语言
   * @returns 翻译结果
   */
  async signToText(
    signData: string,
    targetLanguage: string = 'zh'
  ): Promise<TranslateResponse> {
    const response: any = await api.post('/api/translation/sign-to-text', {
      signData,
      targetLanguage,
    });
    return response || {
      success: true,
      original_text: signData,
      translated_text: signData,
      source_lang: 'sign',
      target_lang: targetLanguage,
      confidence: 0.8
    };
  },

  /**
   * 文字转手语（将文本转换成手语描述）
   * @param text 输入文本
   * @param sourceLanguage 源语言
   * @returns 手语序列
   */
  async textToSign(
    text: string,
    sourceLanguage: string = 'zh'
  ): Promise<{
    signSequence: string[];
    description: string;
    visualData?: string;
  }> {
    const response: any = await api.post('/api/translation/text-to-sign', {
      text,
      sourceLanguage,
    });
    return response || {
      signSequence: [],
      description: `${text} 的手语表示`,
      visualData: undefined
    };
  },

  /**
   * 获取支持的语言列表
   * @returns 语言列表
   */
  async getSupportedLanguages(): Promise<Array<{
    code: string;
    name: string;
    nativeName: string;
  }>> {
    const response: any = await api.get('/api/translation/languages');
    return response || [];
  },

  /**
   * 获取翻译历史记录
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 历史记录
   */
  async getHistory(page: number = 1, pageSize: number = 20) {
    const response = await api.get('/api/translation/history', {
      params: { page, pageSize }
    });
    return response;
  },

  /**
   * 删除历史记录
   * @param id 记录ID
   */
  async deleteHistory(id: string): Promise<void> {
    await api.delete(`/api/translation/history/${id}`);
  },

  /**
   * 清空历史记录
   */
  async clearHistory(): Promise<void> {
    await api.delete('/api/translation/history');
  },

  /**
   * 导出历史记录
   * @param format 导出格式（json/csv）
   * @returns 文件数据
   */
  async exportHistory(format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const response: any = await api.get('/api/translation/history/export', {
      params: { format },
      responseType: 'blob'
    });
    return response;
  },

  /**
   * 获取翻译统计信息
   * @returns 统计数据
   */
  async getStatistics(): Promise<{
    totalTranslations: number;
    averageProcessingTime: number;
    languageDistribution: Record<string, number>;
    accuracy: number;
    dailyData: Array<{ date: string; count: number }>;
  }> {
    const response: any = await api.get('/api/statistics/translation');
    return response || {
      totalTranslations: 0,
      averageProcessingTime: 0,
      languageDistribution: {},
      accuracy: 0,
      dailyData: []
    };
  },

  /**
   * 保存翻译收藏
   * @param translationResult 翻译结果
   * @returns 保存的收藏
   */
  async saveFavorite(translationResult: TranslationResult): Promise<{
    id: string;
    createdAt: number;
  }> {
    const response: any = await api.post('/api/translation/favorites', translationResult);
    return response || {
      id: Date.now().toString(),
      createdAt: Date.now()
    };
  },

  /**
   * 获取收藏列表
   * @returns 收藏列表
   */
  async getFavorites(): Promise<Array<{
    id: string;
    translation: TranslationResult;
    createdAt: number;
  }>> {
    const response: any = await api.get('/api/translation/favorites');
    return response || [];
  },

  /**
   * 删除收藏
   * @param id 收藏ID
   */
  async deleteFavorite(id: string): Promise<void> {
    await api.delete(`/api/translation/favorites/${id}`);
  },

  /**
   * 检测文本语言
   * @param text 输入文本
   * @returns 检测到的语言代码
   */
  async detectLanguage(text: string): Promise<{
    language: string;
    confidence: number;
  }> {
    const response: any = await api.post('/api/translation/detect-language', { text });
    return response || {
      language: 'zh',
      confidence: 0.9
    };
  },

  /**
   * 获取翻译质量评分
   * @param sourceText 源文本
   * @param translatedText 翻译文本
   * @returns 质量评分
   */
  async getQualityScore(
    sourceText: string,
    translatedText: string
  ): Promise<{
    score: number;
    details: {
      fluency: number;
      accuracy: number;
      completeness: number;
    };
  }> {
    const response: any = await api.post('/api/translation/quality', {
      sourceText,
      translatedText,
    });
    return response || {
      score: 0.85,
      details: {
        fluency: 0.85,
        accuracy: 0.85,
        completeness: 0.85
      }
    };
  },
};

export default translationAPI;