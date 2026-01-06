/**
 * 3D手语可视化组件
 * 使用 @react-three/fiber 创建3D场景，显示3D手部模型并播放手语动画
 * 当3D模型加载失败时，自动降级到2D landmarks可视化
 */

import React, { useRef, useEffect, useState, Suspense, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid, Stats, Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { handModelLoader, type LoadedHandModel, DEFAULT_HAND_MODEL_CONFIG } from '../utils/3dHandLoader';
import { animationController, AnimationState, type AnimationProgress } from '../services/animationController';
import { signActionComposer } from '../utils/signActionComposer';
import { SIGN_ACTIONS, getActionById, type SignAction } from '../data/signActions';
import type { HandLandmarks } from '../types';

/**
 * 组件Props
 */
interface Sign3DVisualizerProps {
  /** 要播放的动作ID */
  actionId?: string;
  /** 是否自动播放 */
  autoPlay?: boolean;
  /** 是否显示控制面板 */
  showControls?: boolean;
  /** 是否显示性能统计 */
  showStats?: boolean;
  /** 摄像机位置 */
  cameraPosition?: [number, number, number];
  /** 灯光强度 */
  lightIntensity?: number;
  /** 背景颜色 */
  backgroundColor?: string;
  /** 是否使用环境贴图 */
  useEnvironment?: boolean;
  /** 导出样式类 */
  className?: string;
  /** 手部关键点数据（用于降级显示） */
  landmarks?: HandLandmarks[];
  /** 是否使用降级模式（直接使用2D视图） */
  useFallbackMode?: boolean;
}

/**
 * 手部3D模型组件
 */
const HandModel3D: React.FC<{
  model: LoadedHandModel;
  action: SignAction;
  onActionComplete?: () => void;
}> = ({ model, action, onActionComplete }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 设置动画混合器
    animationController.setMixer(model.mixer);
    setIsLoaded(true);

    // 监听动作完成
    const handleComplete = (actionId: string) => {
      if (actionId === action.id && onActionComplete) {
        onActionComplete();
      }
    };

    animationController.onComplete(handleComplete);

    return () => {
      animationController.removeCompleteCallback(handleComplete);
    };
  }, [model, action, onActionComplete]);

  useEffect(() => {
    // 播放动作
    animationController.addToQueue(action);
  }, [action]);

  // 每帧更新动画
  useFrame((_state: any, delta: number) => {
    animationController.update(delta);
  });

  return (
    <group ref={groupRef}>
      <primitive object={model.scene} />
    </group>
  );
};

/**
 * 加载中提示组件
 */
const LoadingFallback: React.FC<{ message?: string }> = ({ message = '加载中...' }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-lg font-medium">{message}</p>
      </div>
    </div>
  );
};

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
 * 降级模式：基于landmarks的3D可视化组件
 */
const FallbackHandVisualizer: React.FC<{
  landmarks: HandLandmarks[];
  action?: SignAction;
  color?: string;
}> = ({ landmarks, action, color = '#4f46e5' }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state: any) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  // 将MediaPipe坐标转换为Three.js坐标
  const convertCoordinates = (x: number, y: number, z: number) => {
    return {
      x: (x - 0.5) * 4,
      y: -(y - 0.5) * 4,
      z: z * 2,
    };
  };

  // 如果有landmarks数据，直接显示
  if (landmarks && landmarks.length > 0) {
    return (
      <group ref={groupRef}>
        {landmarks.map((hand, handIndex) => {
          const points = hand.points.map(point => {
            const coords = convertCoordinates(point.x, point.y, point.z);
            return [coords.x, coords.y, coords.z] as [number, number, number];
          });

          return (
            <group key={handIndex}>
              {/* 骨架连接 */}
              {HAND_CONNECTIONS.map(([start, end], index) => {
                const startPoint = points[start];
                const endPoint = points[end];
                
                return (
                  <Line
                    key={`line-${handIndex}-${index}`}
                    points={[startPoint, endPoint]}
                    color={color}
                    lineWidth={0.02}
                    opacity={0.8}
                  />
                );
              })}

              {/* 关键点 */}
              {points.map((point, index) => (
                <Sphere
                  key={`point-${handIndex}-${index}`}
                  position={point as [number, number, number]}
                  args={[index === 0 ? 0.08 : 0.04, 32, 32]}
                >
                  <meshStandardMaterial
                    color={index === 0 ? '#ff6b6b' : color}
                    emissive={index === 0 ? '#ff6b6b' : color}
                    emissiveIntensity={0.3}
                  />
                </Sphere>
              ))}
            </group>
          );
        })}
      </group>
    );
  }

  // 如果没有landmarks，显示动作的默认手势
  if (action) {
    // 根据动作类型生成简化的关键点表示
    const getGesturePoints = (actionId: string): [number, number, number][] => {
      const basePoints: [number, number, number][] = Array.from({ length: 21 }, (_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        return [Math.cos(angle) * 0.5, (i / 20 - 0.5) * 2, Math.sin(angle) * 0.5];
      });

      // 根据不同动作调整关键点位置
      if (actionId === '拳头') {
        return basePoints.map(([x, y, z]) => [
          x * 0.3,
          y * 0.3,
          z * 0.3,
        ]);
      } else if (actionId === 'ok手势') {
        return basePoints.map(([x, y, z], i) => {
          if (i === 4 || i === 8) { // 拇指和食指
            return [x * 0.2, y * 0.2, z * 0.2];
          }
          return [x * 0.7, y * 0.7, z * 0.7];
        });
      }

      return basePoints;
    };

    const gesturePoints = getGesturePoints(action.id);

    return (
      <group ref={groupRef}>
        {/* 骨架连接 */}
        {HAND_CONNECTIONS.map(([start, end], index) => {
          const startPoint = gesturePoints[start];
          const endPoint = gesturePoints[end];
          
          return (
            <Line
              key={`gesture-line-${index}`}
              points={[startPoint, endPoint]}
              color={color}
              lineWidth={0.02}
              opacity={0.8}
            />
          );
        })}

        {/* 关键点 */}
        {gesturePoints.map((point, index) => (
          <Sphere
            key={`gesture-point-${index}`}
            position={point}
            args={[index === 0 ? 0.08 : 0.04, 32, 32]}
          >
            <meshStandardMaterial
              color={index === 0 ? '#ff6b6b' : color}
              emissive={index === 0 ? '#ff6b6b' : color}
              emissiveIntensity={0.3}
            />
          </Sphere>
        ))}

        {/* 动作名称标签 */}
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshBasicMaterial color="#4ecdc4" />
        </mesh>
      </group>
    );
  }

  // 默认空闲状态
  const idlePoints: [number, number, number][] = Array.from({ length: 21 }, (_, i) => {
    const angle = (i / 20) * Math.PI * 2;
    return [
      Math.cos(angle) * 0.6,
      (i / 20 - 0.5) * 2.5,
      Math.sin(angle) * 0.6,
    ];
  });

  return (
    <group ref={groupRef}>
      {HAND_CONNECTIONS.map(([start, end], index) => {
        const startPoint = idlePoints[start];
        const endPoint = idlePoints[end];
        
        return (
          <Line
            key={`idle-line-${index}`}
            points={[startPoint, endPoint]}
            color={color}
            lineWidth={0.02}
            opacity={0.7}
          />
        );
      })}

      {idlePoints.map((point, index) => (
        <Sphere
          key={`idle-point-${index}`}
          position={point}
          args={[index === 0 ? 0.08 : 0.04, 32, 32]}
        >
          <meshStandardMaterial
            color={index === 0 ? '#ff6b6b' : color}
            emissive={index === 0 ? '#ff6b6b' : color}
            emissiveIntensity={0.2}
          />
        </Sphere>
      ))}
    </group>
  );
};

/**
 * 控制面板组件
 */
const ControlPanel: React.FC<{
  currentAction: SignAction | null;
  isPlaying: boolean;
  playbackSpeed: number;
  progress: number;
  onPlayPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (progress: number) => void;
  onActionSelect: (actionId: string) => void;
  isFallbackMode?: boolean;
  onSwitchMode?: () => void;
}> = ({
  currentAction,
  isPlaying,
  playbackSpeed,
  progress,
  onPlayPause,
  onStop,
  onSpeedChange,
  onSeek,
  onActionSelect,
  isFallbackMode,
  onSwitchMode,
}) => {
  const [speed, setSpeed] = useState(playbackSpeed);

  useEffect(() => {
    setSpeed(playbackSpeed);
  }, [playbackSpeed]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    onSeek(newProgress);
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(e.target.value);
    setSpeed(newSpeed);
    onSpeedChange(newSpeed);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
      {/* 模式指示器 */}
      {isFallbackMode !== undefined && (
        <div className="mb-3 max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 bg-blue-500/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <span className="text-blue-400 text-sm font-medium">
              {isFallbackMode ? '⚡ 关键点可视化模式' : '🎨 3D 模型模式'}
            </span>
            {onSwitchMode && (
              <button
                onClick={onSwitchMode}
                className="text-blue-400 hover:text-blue-300 text-xs underline"
              >
                切换模式
              </button>
            )}
          </div>
        </div>
      )}

      {/* 动作选择器 */}
      <div className="mb-4 max-w-md mx-auto">
        <label className="block text-white text-sm font-medium mb-2">选择手语动作</label>
        <select
          value={currentAction?.id || ''}
          onChange={(e) => onActionSelect(e.target.value)}
          className="w-full px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- 选择动作 --</option>
          {SIGN_ACTIONS.map((action) => (
            <option key={action.id} value={action.id}>
              {action.name} - {action.description}
            </option>
          ))}
        </select>
      </div>

      {/* 播放控制 - 仅在3D模式下显示 */}
      {!isFallbackMode && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            {/* 进度条 */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={progress}
                onChange={handleSliderChange}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-white/70 mt-1">
                <span>{(progress * 100).toFixed(0)}%</span>
                <span>{currentAction?.name || '未选择'}</span>
              </div>
            </div>

            {/* 播放按钮 */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={onPlayPause}
                className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors shadow-lg"
              >
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>

              <button
                onClick={onStop}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* 速度控制 */}
              <div className="flex items-center gap-2 ml-4">
                <span className="text-white text-sm">速度:</span>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={speed}
                  onChange={handleSpeedChange}
                  className="w-24 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-white text-sm w-12">{speed.toFixed(1)}x</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 3D手语可视化主组件
 */
export const Sign3DVisualizer: React.FC<Sign3DVisualizerProps> = ({
  actionId = '手掌',
  autoPlay = true,
  showControls = true,
  showStats = false,
  cameraPosition = [0, 0, 5],
  lightIntensity = 1,
  backgroundColor = '#1a1a2e',
  useEnvironment = true,
  className = '',
  landmarks = [],
  useFallbackMode = false,
}) => {
  const [model, setModel] = useState<LoadedHandModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<SignAction | null>(null);
  const [progress, setProgress] = useState<AnimationProgress | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(useFallbackMode);

  // 加载3D手部模型（仅在非降级模式下）
  useEffect(() => {
    if (isFallbackMode) {
      setLoading(false);
      setError(null);
      return;
    }

    const loadModel = async () => {
      try {
        console.log('[Sign3DVisualizer] 开始加载3D手部模型...');
        console.log('[Sign3DVisualizer] 模型配置:', DEFAULT_HAND_MODEL_CONFIG);
        setLoading(true);
        setError(null);

        // 预加载模型
        const loadedModel = await handModelLoader.loadModel(DEFAULT_HAND_MODEL_CONFIG);
        console.log('[Sign3DVisualizer] 3D手部模型加载成功');
        setModel(loadedModel);
        setLoading(false);
      } catch (err) {
        const error = err as Error;
        console.error('[Sign3DVisualizer] 加载3D手部模型失败:', {
          error,
          message: error.message,
          modelUrl: DEFAULT_HAND_MODEL_CONFIG.modelUrl
        });
        
        // 自动降级到关键点可视化模式
        console.log('[Sign3DVisualizer] 自动降级到关键点可视化模式');
        setIsFallbackMode(true);
        setLoading(false);
        setError(null);
      }
    };

    loadModel();
  }, [isFallbackMode]);

  // 设置当前动作
  useEffect(() => {
    if (actionId) {
      const action = getActionById(actionId);
      setCurrentAction(action || SIGN_ACTIONS[0]);
    }
  }, [actionId]);

  // 监听动画进度（仅在3D模式下）
  useEffect(() => {
    if (isFallbackMode) return;

    const handleProgress = (p: AnimationProgress) => {
      setProgress(p);
    };

    animationController.onProgress(handleProgress);

    return () => {
      animationController.removeProgressCallback(handleProgress);
    };
  }, [isFallbackMode]);

  // 播放控制函数（仅在3D模式下使用）
  const handlePlayPause = useCallback(() => {
    if (animationController.getState() === AnimationState.PAUSED) {
      animationController.resume();
    } else if (animationController.getState() === AnimationState.PLAYING) {
      animationController.pause();
    }
  }, []);

  const handleStop = useCallback(() => {
    animationController.stop();
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    animationController.setPlaybackSpeed(speed);
  }, []);

  const handleSeek = useCallback((progress: number) => {
    if (progress !== undefined) {
      const currentProgress = progress;
      const totalDuration = currentProgress || 1;
      animationController.seekTo(currentProgress * totalDuration);
    }
  }, []);

  const handleActionSelect = useCallback((selectedActionId: string) => {
    const action = getActionById(selectedActionId);
    if (action) {
      setCurrentAction(action);
      if (!isFallbackMode) {
        animationController.stop();
        animationController.addToQueue(action);
      }
    }
  }, [isFallbackMode]);

  const isPlaying = !isFallbackMode && animationController.getState() === AnimationState.PLAYING;
  const currentProgress = progress?.progress ?? 0;

  // 加载状态
  if (loading) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        <LoadingFallback message="初始化可视化组件..." />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: cameraPosition, fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* 性能统计 */}
        {showStats && <Stats />}

        {/* 环境设置 */}
        {useEnvironment && <Environment preset="city" />}
        <color attach="background" args={[backgroundColor]} />

        {/* 摄像机控制 */}
        <PerspectiveCamera makeDefault position={cameraPosition} fov={50} />
        <OrbitControls
          enableZoom={true}
          enablePan={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={10}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
        />

        {/* 灯光设置 */}
        <ambientLight intensity={0.5 * lightIntensity} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={lightIntensity}
          castShadow
          shadow-mapSize-width={[1024, 2048]}
          shadow-mapSize-height={[1024, 2048]}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <directionalLight position={[-10, -10, -5]} intensity={0.5 * lightIntensity} />
        <pointLight position={[0, 5, 0]} intensity={0.5} color="#fff" />

        {/* 参考网格 */}
        <Grid
          args={[10, 10]}
          cellColor="#4f46e5"
          sectionColor="#6366f1"
          cellSize={1}
          sectionSize={5}
          position={[0, -2, 0]}
          fadeDistance={15}
          infiniteGrid
        />

        {/* 3D手部模型或降级可视化 */}
        <Suspense fallback={null}>
          {isFallbackMode ? (
            <FallbackHandVisualizer
              landmarks={landmarks}
              action={currentAction || undefined}
            />
          ) : (
            model && currentAction && (
              <HandModel3D
                model={model}
                action={currentAction}
                onActionComplete={() => {
                  console.log('动作完成:', currentAction.name);
                }}
              />
            )
          )}
        </Suspense>
      </Canvas>

      {/* 控制面板 */}
      {showControls && currentAction && (
        <ControlPanel
          currentAction={currentAction}
          isPlaying={isPlaying}
          playbackSpeed={animationController.getPlaybackSpeed()}
          progress={currentProgress}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
          onSpeedChange={handleSpeedChange}
          onSeek={handleSeek}
          onActionSelect={handleActionSelect}
          isFallbackMode={isFallbackMode}
          onSwitchMode={() => setIsFallbackMode(!isFallbackMode)}
        />
      )}

      {/* 状态指示器 */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            isPlaying || isFallbackMode ? 'bg-green-500' : 'bg-yellow-500'
          } animate-pulse`}
        />
        <span className="text-white text-sm font-medium bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg">
          {isFallbackMode ? '可视化中' : (isPlaying ? '播放中' : '暂停')}
        </span>
      </div>

      {/* FPS显示 */}
      {showStats && !isFallbackMode && (
        <div className="absolute top-4 right-4 text-white text-xs bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
          FPS: {Math.round(1 / ((progress?.remainingTime || 1 / 60))) || 60}
        </div>
      )}
    </div>
  );
};

export default Sign3DVisualizer;