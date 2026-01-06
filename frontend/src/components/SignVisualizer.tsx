/**
 * 手语可视化组件
 * 用于展示手语识别的手部关键点和骨架连接，支持2D/3D视图切换
 */

import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { HandLandmarks } from '../types';
import { Sign3DVisualizer } from './Sign3DVisualizer';

interface SignVisualizerProps {
  /** 手部关键点数据 */
  landmarks?: HandLandmarks[];
  /** 是否显示骨架 */
  showSkeleton?: boolean;
  /** 是否显示关键点 */
  showPoints?: boolean;
  /** 颜色 */
  color?: string;
  /** 导出样式类 */
  className?: string;
  /** 视图模式 */
  viewMode?: '2d' | '3d';
  /** 要显示的3D动作ID */
  actionId?: string;
  /** 是否自动播放3D动画 */
  autoPlay?: boolean;
}

/**
 * 手部关键点连接关系
 */
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],      // 拇指
  [0, 5], [5, 6], [6, 7], [7, 8],      // 食指
  [0, 9], [9, 10], [10, 11], [11, 12], // 中指
  [0, 13], [13, 14], [14, 15], [15, 16], // 无名指
  [0, 17], [17, 18], [18, 19], [19, 20], // 小指
  [5, 9], [9, 13], [13, 17],           // 手掌
];

/**
 * 单个手部组件 (3D)
 */
const Hand3D: React.FC<{
  landmarks: HandLandmarks;
  color: string;
  showSkeleton: boolean;
  showPoints: boolean;
}> = ({ landmarks, color, showSkeleton, showPoints }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  // 将MediaPipe坐标转换为Three.js坐标
  const convertCoordinates = (x: number, y: number, z: number) => {
    // MediaPipe: x(0-1), y(0-1), z(相对深度)
    // Three.js: 需要翻转y轴并调整比例
    return {
      x: (x - 0.5) * 4,
      y: -(y - 0.5) * 4,
      z: z * 2,
    };
  };

  const points = landmarks.points.map(point => {
    const coords = convertCoordinates(point.x, point.y, point.z);
    return [coords.x, coords.y, coords.z] as [number, number, number];
  });

  return (
    <group ref={groupRef}>
      {/* 骨架连接 */}
      {showSkeleton && HAND_CONNECTIONS.map(([start, end], index) => {
        const startPoint = points[start];
        const endPoint = points[end];
        
        return (
          <Line
            key={index}
            points={[startPoint, endPoint]}
            color={color}
            lineWidth={0.02}
            opacity={0.8}
          />
        );
      })}

      {/* 关键点 */}
      {showPoints && points.map((point, index) => (
        <Sphere
          key={index}
          position={point as [number, number, number]}
          radius={index === 0 ? 0.08 : 0.04}
          args={[index === 0 ? 0.08 : 0.04, 32, 32]}
        >
          <meshStandardMaterial
            color={index === 0 ? '#ff6b6b' : color}
            emissive={index === 0 ? '#ff6b6b' : color}
            emissiveIntensity={0.3}
          />
        </Sphere>
      ))}

      {/* 手掌（手腕） */}
      <Sphere
        position={points[0] as [number, number, number]}
        radius={0.1}
        args={[0.1, 32, 32]}
      >
        <meshStandardMaterial
          color="#4ecdc4"
          emissive="#4ecdc4"
          emissiveIntensity={0.3}
        />
      </Sphere>
    </group>
  );
};

/**
 * 3D手部可视化组件
 */
const SignVisualizer3D: React.FC<{
  landmarks: HandLandmarks[];
  color: string;
  showSkeleton: boolean;
  showPoints: boolean;
}> = ({ landmarks, color, showSkeleton, showPoints }) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      className="w-full h-full"
    >
      {/* 环境光 */}
      <ambientLight intensity={0.5} />
      
      {/* 定向光 */}
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} />

      {/* 背景渐变 */}
      <color attach="background" args={['#1a1a2e']} />

      {/* 手部渲染 */}
      {landmarks.map((hand, index) => (
        <Hand3D
          key={index}
          landmarks={hand}
          color={color}
          showSkeleton={showSkeleton}
          showPoints={showPoints}
        />
      ))}

      {/* 控制器 */}
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={10}
      />

      {/* 参考网格 */}
      <gridHelper
        args={[10, 10, '#2d2d44', '#2d2d44']}
        position={[0, -2, 0]}
      />
    </Canvas>
  );
};

/**
 * 2D手语可视化组件
 */
const SignVisualizer2D: React.FC<{
  landmarks: HandLandmarks[];
  width?: number;
  height?: number;
  color?: string;
}> = ({
  landmarks = [],
  width = 640,
  height = 480,
  color = '#4f46e5',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 绘制背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    if (landmarks && landmarks.length > 0) {
      landmarks.forEach(hand => {
        // 转换坐标
        const points = hand.points.map(point => ({
          x: point.x * width,
          y: point.y * height,
        }));

        // 绘制骨架
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        HAND_CONNECTIONS.forEach(([start, end]) => {
          const startPoint = points[start];
          const endPoint = points[end];

          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(endPoint.x, endPoint.y);
          ctx.stroke();
        });

        // 绘制关键点
        points.forEach((point, index) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, index === 0 ? 8 : 5, 0, Math.PI * 2);
          ctx.fillStyle = index === 0 ? '#4ecdc4' : color;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      });
    }
  }, [landmarks, width, height, color]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full h-auto rounded-lg"
    />
  );
};

/**
 * 手语可视化主组件
 */
export const SignVisualizer: React.FC<SignVisualizerProps> = ({
  landmarks = [],
  showSkeleton = true,
  showPoints = true,
  color = '#4f46e5',
  className = '',
  viewMode = '2d',
  actionId = '手掌',
  autoPlay = true,
}) => {
  const [currentViewMode, setCurrentViewMode] = useState<'2d' | '3d'>(viewMode);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* 视图切换按钮 */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setCurrentViewMode('2d')}
          className={`px-4 py-2 rounded-lg transition-all ${
            currentViewMode === '2d'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
          }`}
        >
          2D 视图
        </button>
        <button
          onClick={() => setCurrentViewMode('3d')}
          className={`px-4 py-2 rounded-lg transition-all ${
            currentViewMode === '3d'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
          }`}
        >
          3D 视图
        </button>
      </div>

      {/* 2D 识别视图 */}
      {currentViewMode === '2d' && landmarks.length > 0 && (
        <SignVisualizer3D
          landmarks={landmarks}
          color={color}
          showSkeleton={showSkeleton}
          showPoints={showPoints}
        />
      )}

      {/* 2D 画布视图（用于简单显示） */}
      {currentViewMode === '2d' && landmarks.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
          <SignVisualizer2D
            landmarks={landmarks}
            width={320}
            height={240}
            color={color}
          />
        </div>
      )}

      {/* 3D 手语动作视图 */}
      {currentViewMode === '3d' && (
        <Sign3DVisualizer
          actionId={actionId}
          autoPlay={autoPlay}
          showControls={true}
          className="w-full h-full"
        />
      )}

      {/* 图例（仅在2D视图显示） */}
      {currentViewMode === '2d' && landmarks.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white text-sm">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-4 h-4 rounded-full bg-[#4ecdc4]"></div>
            <span>手腕</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></div>
            <span>关键点</span>
          </div>
        </div>
      )}

      {/* 提示信息 */}
      {landmarks.length === 0 && currentViewMode === '2d' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <p className="text-lg font-medium">等待手部识别...</p>
            <p className="text-sm text-gray-400 mt-2">请确保摄像头正常工作</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignVisualizer;