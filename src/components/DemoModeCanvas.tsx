/**
 * 演示模式画布组件
 * 使用Canvas动画模拟手语输入体验
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// 手语动作类型
type SignGesture = 'hello' | 'thankyou' | 'sorry' | 'love' | 'yes' | 'no';

interface DemoModeCanvasProps {
  onRecognized: (gesture: string, confidence: number) => void;
  className?: string;
}

// 手语动作定义
const GESTURES: Record<SignGesture, { label: string; color: string; description: string }> = {
  hello: { label: '你好', color: '#3B82F6', description: '挥手问候' },
  thankyou: { label: '谢谢', color: '#10B981', description: '双手合十' },
  sorry: { label: '对不起', color: '#F59E0B', description: '双手捂心' },
  love: { label: '爱', color: '#EF4444', description: '比心手势' },
  yes: { label: '是', color: '#8B5CF6', description: '点头手势' },
  no: { label: '否', color: '#6B7280', description: '摇头手势' },
};

// 手部坐标点
interface HandPoint {
  x: number;
  y: number;
}

// 模拟手部路径
const GESTURE_PATHS: Record<SignGesture, HandPoint[][]> = {
  hello: [
    // 左手挥动
    [{x: 0.2, y: 0.4}, {x: 0.25, y: 0.35}, {x: 0.2, y: 0.4}, {x: 0.15, y: 0.35}, {x: 0.2, y: 0.4}],
    // 右手挥动
    [{x: 0.8, y: 0.4}, {x: 0.75, y: 0.35}, {x: 0.8, y: 0.4}, {x: 0.85, y: 0.35}, {x: 0.8, y: 0.4}]
  ],
  thankyou: [
    // 双手合十
    [{x: 0.5, y: 0.3}, {x: 0.5, y: 0.35}, {x: 0.5, y: 0.4}, {x: 0.5, y: 0.45}, {x: 0.5, y: 0.5}]
  ],
  sorry: [
    // 双手捂心
    [{x: 0.45, y: 0.5}, {x: 0.5, y: 0.48}, {x: 0.55, y: 0.5}, {x: 0.5, y: 0.52}],
    [{x: 0.48, y: 0.45}, {x: 0.5, y: 0.47}, {x: 0.52, y: 0.45}, {x: 0.5, y: 0.43}]
  ],
  love: [
    // 比心手势
    [{x: 0.4, y: 0.4}, {x: 0.45, y: 0.35}, {x: 0.5, y: 0.3}, {x: 0.55, y: 0.35}, {x: 0.6, y: 0.4}]
  ],
  yes: [
    // 点头
    [{x: 0.5, y: 0.35}, {x: 0.5, y: 0.4}, {x: 0.5, y: 0.45}, {x: 0.5, y: 0.4}, {x: 0.5, y: 0.35}]
  ],
  no: [
    // 摇头
    [{x: 0.45, y: 0.4}, {x: 0.4, y: 0.4}, {x: 0.45, y: 0.4}, {x: 0.5, y: 0.4}, {x: 0.55, y: 0.4}, {x: 0.5, y: 0.4}]
  ]
};

export const DemoModeCanvas: React.FC<DemoModeCanvasProps> = ({ onRecognized, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  const [currentGesture, setCurrentGesture] = useState<SignGesture>('hello');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [confidence, setConfidence] = useState(0);

  // 绘制背景
  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1E293B');
    gradient.addColorStop(1, '#0F172A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 绘制网格
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  // 绘制手势提示文本
  const drawGestureHint = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gesture = GESTURES[currentGesture];
    
    // 绘制提示框
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeStyle = gesture.color;
    ctx.lineWidth = 2;
    
    const boxWidth = 300;
    const boxHeight = 80;
    const x = (width - boxWidth) / 2;
    const y = height - 100;
    
    ctx.beginPath();
    ctx.roundRect(x, y, boxWidth, boxHeight, 10);
    ctx.fill();
    ctx.stroke();

    // 绘制文本
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`手势: ${gesture.label}`, width / 2, y + 35);
    
    ctx.font = '14px Arial';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(gesture.description, width / 2, y + 60);

    // 绘制置信度条
    if (isAnimating) {
      const barWidth = 200;
      const barHeight = 6;
      const barX = (width - barWidth) / 2;
      const barY = y - 20;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, 3);
      ctx.fill();

      const progress = animationProgress;
      const filledWidth = barWidth * progress;

      const progressGradient = ctx.createLinearGradient(barX, barY, barX + filledWidth, barY);
      progressGradient.addColorStop(0, gesture.color);
      progressGradient.addColorStop(1, '#FFFFFF');
      ctx.fillStyle = progressGradient;
      ctx.beginPath();
      ctx.roundRect(barX, barY, filledWidth, barHeight, 3);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`识别中... ${(progress * 100).toFixed(0)}%`, width / 2, barY - 10);
    }
  };

  // 绘制手势动画
  const drawGestureAnimation = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const paths = GESTURE_PATHS[currentGesture];
    const gesture = GESTURES[currentGesture];
    
    paths.forEach((path, pathIndex) => {
      ctx.strokeStyle = gesture.color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = gesture.color;
      ctx.shadowBlur = 10;

      ctx.beginPath();
      let firstPoint = true;
      
      // 根据动画进度绘制部分路径
      const pointsToDraw = Math.floor(path.length * animationProgress);
      const partialPoint = (path.length * animationProgress) % 1;
      
      path.forEach((point, pointIndex) => {
        const x = point.x * width;
        const y = point.y * height;

        if (pointIndex >= pointsToDraw) {
          return;
        }

        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }

        // 绘制点
        ctx.fillStyle = gesture.color;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
      });

      // 绘制部分点到下一个点
      if (pointsToDraw < path.length && partialPoint > 0) {
        const currentPoint = path[pointsToDraw];
        const nextPoint = path[pointsToDraw];
        const x = currentPoint.x * width + (nextPoint.x * width - currentPoint.x * width) * partialPoint;
        const y = currentPoint.y * height + (nextPoint.y * height - currentPoint.y * height) * partialPoint;
        ctx.lineTo(x, y);

        ctx.fillStyle = gesture.color;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
    });
  };

  // 绘制手部图标
  const drawHandIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👋', x, y);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 清除画布
    ctx.clearRect(0, 0, width, height);

    // 绘制背景
    drawBackground(ctx, width, height);

    // 绘制手势提示
    drawGestureHint(ctx, width, height);

    // 绘制动画
    if (isAnimating) {
      drawGestureAnimation(ctx, width, height);
    } else {
      // 绘制静态手部图标
      drawHandIcon(ctx, width / 2, height / 2, 40);
    }
  };

  const runAnimation = () => {
    setIsAnimating(true);
    setAnimationProgress(0);

    let startTime: number | null = null;
    const duration = 2000; // 2秒动画

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      const progress = Math.min(elapsed / duration, 1);
      setAnimationProgress(progress);

      if (progress >= 1) {
        // 动画完成
        setIsAnimating(false);
        const finalConfidence = 0.85 + Math.random() * 0.1; // 85-95%之间的随机置信度
        setConfidence(finalConfidence);
        onRecognized(GESTURES[currentGesture].label, finalConfidence);

        // 3秒后切换到下一个手势
        setTimeout(() => {
          const gestureKeys = Object.keys(GESTURES) as SignGesture[];
          const currentIndex = gestureKeys.indexOf(currentGesture);
          const nextIndex = (currentIndex + 1) % gestureKeys.length;
          setCurrentGesture(gestureKeys[nextIndex]);
          setConfidence(0);
          runAnimation();
        }, 3000);
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 设置画布尺寸
    canvas.width = 1280;
    canvas.height = 720;

    // 启动动画循环
    const drawLoop = () => {
      draw();
      requestAnimationFrame(drawLoop);
    };
    
    const animationId = requestAnimationFrame(drawLoop);

    // 开始第一个手势
    const startAnimation = setTimeout(() => {
      runAnimation();
    }, 1000);

    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(startAnimation);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentGesture]);

  return (
    <div className={`relative w-full h-full bg-slate-900 ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
        style={{ imageRendering: 'auto' }}
      />
      
      {/* 演示模式标签 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white px-4 py-2 rounded-full font-bold shadow-lg"
      >
        ⚡ 演示模式
      </motion.div>

      {/* 手语控制按钮 */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2"
      >
        {Object.entries(GESTURES).map(([key, gesture]) => (
          <button
            key={key}
            onClick={() => {
              setCurrentGesture(key as SignGesture);
              setConfidence(0);
              if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
              }
              runAnimation();
            }}
            className={`p-3 rounded-lg transition-all ${
              currentGesture === key
                ? 'bg-white shadow-lg scale-110'
                : 'bg-white/20 hover:bg-white/40'
            }`}
            title={gesture.label}
            style={{
              border: currentGesture === key ? `2px solid ${gesture.color}` : 'none'
            }}
          >
            <span className="text-2xl">✋</span>
            <span className="block text-xs mt-1">{gesture.label}</span>
          </button>
        ))}
      </motion.div>
    </div>
  );
};

export default DemoModeCanvas;