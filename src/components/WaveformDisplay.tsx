/**
 * 波形显示组件
 * 用于显示音频波形可视化
 */

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { WaveformData } from '../types';

interface WaveformDisplayProps {
  /** 波形数据 */
  data: WaveformData | number[];
  /** 颜色 */
  color?: string;
  /** 高度 */
  height?: number;
  /** 是否显示标签 */
  showLabels?: boolean;
  /** 导出样式类 */
  className?: string;
}

/**
 * 波形显示组件
 */
export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  data,
  color = '#4f46e5',
  height = 100,
  showLabels = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 处理波形数据
    let waveformData: number[];
    if (Array.isArray(data)) {
      waveformData = data;
    } else {
      waveformData = data.amplitudes;
    }

    // 设置画布尺寸
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // 清空画布
    ctx.clearRect(0, 0, rect.width, rect.height);

    // 创建渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, color);

    // 绘制波形
    const barWidth = rect.width / waveformData.length;
    const barGap = Math.max(1, barWidth * 0.2);
    const actualBarWidth = barWidth - barGap;

    waveformData.forEach((amplitude, index) => {
      const barHeight = (amplitude / 255) * height;
      const x = index * barWidth;
      const y = (rect.height - barHeight) / 2;

      // 绘制条形
      ctx.fillStyle = gradient;
      
      // 圆角条形
      const radius = Math.min(actualBarWidth / 2, barHeight / 2);
      
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + actualBarWidth - radius, y);
      ctx.quadraticCurveTo(x + actualBarWidth, y, x + actualBarWidth, y + radius);
      ctx.lineTo(x + actualBarWidth, y + barHeight - radius);
      ctx.quadraticCurveTo(x + actualBarWidth, y + barHeight, x + actualBarWidth - radius, y + barHeight);
      ctx.lineTo(x + radius, y + barHeight);
      ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      
      ctx.fill();
    });

    // 绘制中心线
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rect.height / 2);
    ctx.lineTo(rect.width, rect.height / 2);
    ctx.stroke();

  }, [data, color, height]);

  const duration = Array.isArray(data) ? 0 : data.duration;
  const sampleRate = Array.isArray(data) ? 44100 : data.sampleRate;

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ height: `${height}px` }}
        className="w-full"
      />
      
      {showLabels && (
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0:00</span>
          <span>{Array.isArray(data) ? '波形数据' : `${duration.toFixed(1)}s`}</span>
        </div>
      )}
    </div>
  );
};

/**
 * 实时波形显示组件
 */
export const LiveWaveform: React.FC<{
  analyser: AnalyserNode;
  color?: string;
  height?: number;
  barCount?: number;
  className?: string;
}> = ({
  analyser,
  color = '#4f46e5',
  height = 100,
  barCount = 64,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const step = Math.floor(bufferLength / barCount);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      // 获取频率数据
      analyser.getByteFrequencyData(dataArray);

      // 设置画布尺寸
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      // 清空画布
      ctx.clearRect(0, 0, rect.width, rect.height);

      // 绘制条形
      const barWidth = rect.width / barCount;
      const barGap = Math.max(1, barWidth * 0.2);
      const actualBarWidth = barWidth - barGap;

      for (let i = 0; i < barCount; i++) {
        // 计算平均振幅
        let sum = 0;
        const startIdx = i * step;
        for (let j = 0; j < step && startIdx + j < bufferLength; j++) {
          sum += dataArray[startIdx + j];
        }
        const amplitude = sum / step / 255;

        const barHeight = amplitude * height;
        const x = i * barWidth;
        const y = (rect.height - barHeight) / 2;

        // 绘制渐变条形
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, adjustColor(color, -30));

        ctx.fillStyle = gradient;
        
        // 圆角条形
        ctx.beginPath();
        ctx.roundRect(x, y, actualBarWidth, barHeight, actualBarWidth / 2);
        ctx.fill();
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, color, height, barCount]);

  return (
    <canvas
      ref={canvasRef}
      style={{ height: `${height}px` }}
      className={`w-full ${className}`}
    />
  );
};

/**
 * 圆形波形显示组件
 */
export const CircularWaveform: React.FC<{
  data: number[];
  color?: string;
  size?: number;
  className?: string;
}> = ({
  data,
  color = '#4f46e5',
  size = 200,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size / 2) * 0.8;
    const barWidth = (Math.PI * 2) / data.length;

    // 清空画布
    ctx.clearRect(0, 0, size, size);

    // 绘制圆形波形
    data.forEach((amplitude, index) => {
      const angle = (index * barWidth) - Math.PI / 2;
      const barHeight = (amplitude / 255) * (size * 0.2);

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const endX = centerX + Math.cos(angle) * (radius + barHeight);
      const endY = centerY + Math.sin(angle) * (radius + barHeight);

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
    });

    // 绘制中心圆
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

  }, [data, color, size]);

  return (
    <motion.canvas
      ref={canvasRef}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`rounded-full ${className}`}
    />
  );
};

/**
 * 调整颜色亮度
 */
function adjustColor(hex: string, amount: number): string {
  const color = hex.replace('#', '');
  const num = parseInt(color, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default WaveformDisplay;