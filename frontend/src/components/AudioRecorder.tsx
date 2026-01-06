/**
 * 录音组件
 * 提供音频录制功能，支持波形显示和回放
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Play, Pause, Trash2, Send } from 'lucide-react';
import type { RecordingConfig, WaveformData } from '../types';

interface AudioRecorderProps {
  /** 录音配置 */
  config?: RecordingConfig;
  /** 是否允许录制 */
  allowRecording?: boolean;
  /** 最大录制时长（秒） */
  maxDuration?: number;
  /** 录音完成回调 */
  onComplete?: (audioBlob: Blob, duration: number) => void;
  /** 导出样式类 */
  className?: string;
}

/**
 * 录音组件
 */
export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  config,
  allowRecording = true,
  maxDuration = 60,
  onComplete,
  className = '',
}) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  /**
   * 开始录音
   */
  const startRecording = useCallback(async () => {
    if (!allowRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 创建分析器用于波形显示
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      setAnalyser(analyserNode);

      // 创建MediaRecorder
      const mimeType = getSupportedMimeType(config?.format || 'wav');
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // 合并音频块
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const duration = Date.now() - (duration * 1000);
        
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setIsRecording(false);
        
        // 停止所有轨道
        stream.getTracks().forEach(track => track.stop());
        
        // 回调
        onComplete?.(blob, duration / 1000);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setIsRecording(true);
      setDuration(0);
      setWaveform([]);

      // 启动波形动画
      startWaveformAnimation();

      // 启动计时器
      timerRef.current = window.setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('录音启动失败:', error);
    }
  }, [allowRecording, config, maxDuration, duration, onComplete]);

  /**
   * 停止录音
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // 清理波形动画
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // 清理计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  /**
   * 播放/暂停音频
   */
  const togglePlayPause = useCallback(() => {
    const audio = new Audio(audioUrl || undefined);
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
      
      audio.onended = () => {
        setIsPlaying(false);
      };
    }
  }, [audioUrl, isPlaying]);

  /**
   * 删除录音
   */
  const deleteRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setWaveform([]);
  }, [audioUrl]);

  /**
   * 发送录音
   */
  const sendRecording = useCallback(() => {
    if (audioBlob) {
      onComplete?.(audioBlob, duration);
    }
  }, [audioBlob, duration, onComplete]);

  /**
   * 启动波形动画
   */
  const startWaveformAnimation = useCallback(() => {
    const drawWaveform = () => {
      if (!analyser || !isRecording) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      // 简化波形数据
      const simpleWaveform: number[] = [];
      const step = Math.floor(bufferLength / 32);
      
      for (let i = 0; i < bufferLength; i += step) {
        let sum = 0;
        for (let j = 0; j < step && i + j < bufferLength; j++) {
          sum += dataArray[i + j];
        }
        simpleWaveform.push(sum / step / 255);
      }

      setWaveform(simpleWaveform);
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    };

    drawWaveform();
  }, [analyser, isRecording]);

  /**
   * 获取支持的MIME类型
   */
  const getSupportedMimeType = (format: string): string => {
    const types = {
      wav: 'audio/wav',
      mp3: 'audio/mpeg',
      ogg: 'audio/ogg',
    };

    const mimeType = types[format as keyof typeof types] || 'audio/webm';
    
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
    
    // 降级到webm
    return 'audio/webm';
  };

  /**
   * 格式化时长
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * 清理
   */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div className={`bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 ${className}`}>
      {/* 波形显示区域 */}
      <div className="h-32 flex items-center justify-center mb-6 bg-white rounded-xl shadow-sm">
        {waveform.length > 0 ? (
          <div className="flex items-center space-x-1 h-20">
            {waveform.map((amplitude, index) => (
              <motion.div
                key={index}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: amplitude }}
                transition={{ duration: 0.1 }}
                className="w-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full"
                style={{
                  transformOrigin: 'bottom',
                  height: `${Math.max(4, amplitude * 80)}px`,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-gray-400 text-sm">
            {audioBlob ? '录音已完成' : '点击麦克风开始录音'}
          </div>
        )}
      </div>

      {/* 时长显示 */}
      <div className="text-center mb-6">
        <span className={`text-3xl font-bold ${isRecording ? 'text-red-500' : 'text-gray-700'}`}>
          {formatDuration(duration)}
        </span>
        <span className="text-gray-500 text-sm ml-2">/ {formatDuration(maxDuration)}</span>
      </div>

      {/* 控制按钮 */}
      <div className="flex items-center justify-center space-x-4">
        {/* 删除按钮 */}
        {audioBlob && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={deleteRecording}
            className="p-3 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition-colors"
            title="删除录音"
          >
            <Trash2 className="w-6 h-6" />
          </motion.button>
        )}

        {/* 录音/停止按钮 */}
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!allowRecording}
          className={`
            p-6 rounded-full transition-colors
            ${isRecording 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
            }
            ${!allowRecording ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          title={isRecording ? '停止录音' : '开始录音'}
        >
          {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
        </motion.button>

        {/* 播放按钮 */}
        {audioBlob && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={togglePlayPause}
            className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </motion.button>
        )}

        {/* 发送按钮 */}
        {audioBlob && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={sendRecording}
            className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
            title="发送录音"
          >
            <Send className="w-6 h-6" />
          </motion.button>
        )}
      </div>

      {/* 状态提示 */}
      <div className="mt-4 text-center">
        <motion.p
          key={isRecording ? 'recording' : 'idle'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-gray-600"
        >
          {isRecording 
            ? '🎙️ 正在录音中...' 
            : audioBlob 
            ? '✅ 录音已完成，您可以播放或发送' 
            : '👆 点击中间按钮开始录音'
          }
        </motion.p>
      </div>
    </div>
  );
};

export default AudioRecorder;