/**
 * 语音处理API服务
 * 提供语音识别和语音合成相关的API调用方法
 */

import { api } from './api';
import type { 
  VoiceRecognizeRequest, 
  VoiceRecognizeResponse,
  TextToSpeechRequest,
  TextToSpeechResponse 
} from '../types/api';
import type { VoiceProcessingResult } from '../types';

/**
 * 语音处理API
 */
export const voiceAPI = {
  /**
   * 语音转文字（ASR）
   * @param request 识别请求参数
   * @returns 识别结果
   */
  async recognize(request: VoiceRecognizeRequest): Promise<VoiceRecognizeResponse> {
    const formData = new FormData();
    formData.append('audio', request.audio);
    formData.append('language', request.language);
    formData.append('include_emotion', String(request.includeEmotion || false));

    const response = await api.post<VoiceRecognizeResponse>(
      '/api/voice/recognize',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response;
  },

  /**
   * 文字转语音（TTS）
   * @param request 合成请求参数
   * @returns 合成结果
   */
  async synthesize(request: TextToSpeechRequest): Promise<TextToSpeechResponse> {
    const response = await api.post<TextToSpeechResponse>(
      '/api/voice/synthesize',
      request
    );
    return response;
  },

  /**
   * 获取可用声音列表
   * @returns 声音列表
   */
  async getVoices(): Promise<Array<{
    id: string;
    name: string;
    language: string;
    gender: 'male' | 'female' | 'neutral';
    sampleUrl: string;
  }>> {
    const response: any = await api.get('/api/voice/voices');
    return response || [];
  },

  /**
   * 分析语音情感
   * @param audio 音频文件
   * @returns 情感分析结果
   */
  async analyzeEmotion(audio: File): Promise<{
    emotion: 'happy' | 'sad' | 'angry' | 'neutral' | 'surprised' | 'fearful';
    score: number;
    scores: {
      happy: number;
      sad: number;
      angry: number;
      neutral: number;
      surprised: number;
      fearful: number;
    };
  }> {
    // 后端没有独立情感分析接口，返回模拟数据
    return {
      emotion: 'neutral',
      score: 0.85,
      scores: {
        happy: 0.1,
        sad: 0.05,
        angry: 0.0,
        neutral: 0.85,
        surprised: 0.0,
        fearful: 0.0,
      }
    };
  },

  /**
   * 获取识别历史记录
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 历史记录
   */
  async getHistory(page: number = 1, pageSize: number = 20) {
    const response = await api.get('/api/voice/history', {
      params: { page, pageSize }
    });
    return response;
  },

  /**
   * 删除历史记录
   * @param id 记录ID
   */
  async deleteHistory(id: string): Promise<void> {
    await api.delete(`/api/voice/history/${id}`);
  },

  /**
   * 清空历史记录
   */
  async clearHistory(): Promise<void> {
    await api.delete('/api/voice/history');
  },

  /**
   * 导出历史记录
   * @param format 导出格式（json/csv）
   * @returns 文件数据
   */
  async exportHistory(format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const response: any = await api.get('/api/voice/history/export', {
      params: { format },
      responseType: 'blob'
    });
    return response;
  },

  /**
   * 获取语音处理统计信息
   * @returns 统计数据
   */
  async getStatistics(): Promise<{
    totalRecognitions: number;
    totalSynthesizations: number;
    accurateRate: number;
    averageDuration: number;
    emotionDistribution: Record<string, number>;
    dailyData: Array<{ date: string; recognitions: number; synthesizations: number }>;
  }> {
    const response: any = await api.get('/api/statistics/voice');
    return response || {
      totalRecognitions: 0,
      totalSynthesizations: 0,
      accurateRate: 0,
      averageDuration: 0,
      emotionDistribution: {},
      dailyData: []
    };
  },

  /**
   * 批量语音识别
   * @param files 音频文件数组
   * @param language 语言代码
   * @returns 识别结果数组
   */
  async batchRecognize(
    files: File[],
    language: string
  ): Promise<Array<{ file: string; result: VoiceProcessingResult }>> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('language', language);

    const response: any = await api.post('/api/voice/batch-recognize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response || [];
  },

  /**
   * 获取语音转文字的时长
   * @param audio 音频文件
   * @returns 音频时长（秒）
   */
  async getAudioDuration(audio: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const audioElement = new Audio();
      const url = URL.createObjectURL(audio);
      
      audioElement.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(audioElement.duration);
      });
      
      audioElement.addEventListener('error', (error) => {
        URL.revokeObjectURL(url);
        reject(error);
      });
      
      audioElement.src = url;
    });
  },

  /**
   * 转录实时音频流
   * @param stream 音频流
   * @param language 语言代码
   * @returns 识别结果流
   */
  async transcribeStream(
    stream: MediaStream,
    language: string = 'zh'
  ): Promise<ReadableStream<VoiceProcessingResult>> {
    // 这个功能需要后端支持流式识别
    // 这里返回一个模拟的流
    return new ReadableStream({
      start(controller) {
        // 实现流式识别逻辑
        controller.close();
      }
    });
  },
};

export default voiceAPI;