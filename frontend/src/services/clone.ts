/**
 * 声音克隆API服务
 * 提供声音克隆和声音管理相关的API调用方法
 */

import { api } from './api';
import type { 
  VoiceCloneTrainRequest,
  VoiceCloneTrainResponse,
  TextToSpeechRequest
} from '../types/api';
import type { VoiceCloningResult, VoiceProfile } from '../types';

/**
 * 声音克隆API
 */
export const cloneAPI = {
  /**
   * 训练声音克隆模型
   * @param request 训练请求参数
   * @returns 训练结果
   */
  async train(request: VoiceCloneTrainRequest): Promise<VoiceCloneTrainResponse> {
    const formData = new FormData();
    
    if (Array.isArray(request.audio)) {
      request.audio.forEach((file) => {
        formData.append('audio', file);
      });
    } else {
      formData.append('audio', request.audio);
    }
    
    formData.append('voice_name', request.voiceName);

    const response: any = await api.post(
      '/api/clone/train',
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
   * 使用克隆声音合成语音
   * @param request 合成请求参数
   * @returns 合成结果
   */
  async synthesize(request: TextToSpeechRequest): Promise<{
    audioUrl: string;
    text: string;
    voiceId: string;
    duration: number;
  }> {
    const response: any = await api.post('/api/clone/synthesize', request);
    return response;
  },

  /**
   * 获取声音档案列表
   * @returns 声音档案列表
   */
  async getVoiceProfiles(): Promise<VoiceProfile[]> {
    const response: any = await api.get('/api/clone/profiles');
    return response?.profiles || response || [];
  },

  /**
   * 获取声音档案详情
   * @param voiceId 声音ID
   * @returns 声音档案详情
   */
  async getVoiceProfile(voiceId: string): Promise<{
    id: string;
    name: string;
    createdAt: number;
    sampleUrl: string;
    isDefault: boolean;
    metadata: {
      totalDuration: number;
      sampleCount: number;
      qualityScore: number;
    };
  }> {
    const response: any = await api.get(`/api/clone/profiles/${voiceId}`);
    return response;
  },

  /**
   * 创建声音档案
   * @param name 档案名称
   * @param audio 样本音频
   * @param onProgress 上传进度回调
   * @returns 创建的声音档案
   */
  async createVoiceProfile(
    name: string,
    audio: File,
    onProgress?: (progress: number) => void
  ): Promise<VoiceProfile> {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('audio', audio);

    const response: any = await api.post(
      '/api/clone/sample/upload',
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
   * 更新声音档案
   * @param voiceId 声音ID
   * @param data 更新数据
   * @returns 更新后的档案
   */
  async updateVoiceProfile(
    voiceId: string,
    data: {
      name?: string;
      isDefault?: boolean;
      audio?: File;
    }
  ): Promise<VoiceProfile> {
    const formData = new FormData();
    if (data.name) formData.append('name', data.name);
    if (data.isDefault !== undefined) formData.append('is_default', String(data.isDefault));
    if (data.audio) formData.append('audio', data.audio);

    const response: any = await api.put(
      `/api/clone/profiles/${voiceId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response || {};
  },

  /**
   * 删除声音档案
   * @param voiceId 声音ID
   */
  async deleteVoiceProfile(voiceId: string): Promise<void> {
    await api.delete(`/api/clone/profiles/${voiceId}`);
  },

  /**
   * 设置默认声音
   * @param voiceId 声音ID
   */
  async setDefaultVoice(voiceId: string): Promise<void> {
    await api.post(`/api/clone/profiles/${voiceId}`);
  },

  /**
   * 获取合成历史记录
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 历史记录
   */
  async getHistory(page: number = 1, pageSize: number = 20) {
    const response = await api.get('/api/clone/history', {
      params: { page, pageSize }
    });
    return response;
  },

  /**
   * 删除历史记录
   * @param id 记录ID
   */
  async deleteHistory(id: string): Promise<void> {
    await api.delete(`/api/clone/history/${id}`);
  },

  /**
   * 清空历史记录
   */
  async clearHistory(): Promise<void> {
    await api.delete('/api/clone/history');
  },

  /**
   * 检查训练状态
   * @param voiceId 声音ID
   * @returns 训练状态
   */
  async getTrainingStatus(voiceId: string): Promise<{
    voiceId: string;
    status: 'training' | 'completed' | 'failed';
    progress: number;
    estimatedTime?: number;
    error?: string;
  }> {
    const response: any = await api.get(`/api/clone/profiles/${voiceId}`);
    return response || {
      voiceId,
      status: 'completed',
      progress: 100,
    } as any;
  },

  /**
   * 获取声音克隆统计信息
   * @returns 统计数据
   */
  async getStatistics(): Promise<{
    totalVoices: number;
    totalSynthesizations: number;
    averageSynthesisTime: number;
    voiceQualityDistribution: Record<string, number>;
    dailyData: Array<{ date: string; synthesizations: number; voices: number }>;
  }> {
    const response: any = await api.get('/api/statistics/clone');
    return response || {
      totalVoices: 0,
      totalSynthesizations: 0,
      averageSynthesisTime: 0,
      voiceQualityDistribution: {},
      dailyData: []
    };
  },

  /**
   * 批量合成语音
   * @param requests 合成请求数组
   * @returns 合成结果数组
   */
  async batchSynthesize(
    requests: Array<{ text: string; voiceId: string }>
  ): Promise<Array<{ text: string; audioUrl: string; voiceId: string }>> {
    const response: any = await api.post('/api/clone/batch-synthesize', { requests });
    return response || [];
  },

  /**
   * 预览声音
   * @param voiceId 声音ID
   * @param sampleText 示例文本
   * @returns 预览音频URL
   */
  async previewVoice(
    voiceId: string,
    sampleText: string = '这是一个声音预览示例。'
  ): Promise<{ audioUrl: string; duration: number }> {
    const response = await api.post(`/api/clone/voices/${voiceId}/preview`, {
      text: sampleText,
    });
    return response;
  },
};

export default cloneAPI;