/**
 * 手语动作合成器
 * 用于生成动作序列、动作拼接融合、节奏控制和平滑插值
 */

import * as THREE from 'three';
import type {
  SignAction,
  ActionParameters,
  FingerPose,
  PalmPose,
  ActionKeyframe,
} from '../data/signActions';
import { FingerState } from '../data/signActions';

/**
 * 动作序列项
 */
export interface ActionSequenceItem {
  /** 动作 */
  action: SignAction;
  /** 动作参数 */
  params: ActionParameters;
  /** 持续时间（秒） */
  duration: number;
  /** 开始时间（秒） */
  startTime: number;
}

/**
 * 合成动作配置
 */
export interface CompositionConfig {
  /** 动作序列 */
  actions: ActionSequenceItem[];
  /** 总时长（秒） */
  totalDuration: number;
  /** 是否使用过渡 */
  useTransitions: boolean;
  /** 过渡持续时间（秒） */
  transitionDuration: number;
  /** 整体速度 */
  speed: number;
}

/**
 * 节奏模式
 */
export enum RhythmPattern {
  /** 匀速 */
  UNIFORM = 'uniform',
  /** 渐快 */
  ACCELERATING = 'accelerating',
  /** 渐慢 */
  DECELERATING = 'decelerating',
  /** 波动 */
  OSCILLATING = 'oscillating',
}

/**
 * 节奏配置
 */
export interface RhythmConfig {
  /** 节奏模式 */
  pattern: RhythmPattern;
  /** 基础速度 */
  baseSpeed: number;
  /** 最大速度变化 */
  speedVariation: number;
}

/**
 * 手语动作合成器类
 */
class SignActionComposer {
  /**
   * 创建动作序列
   * @param actions - 动作数组
   * @param params - 动作参数（可选）
   * @returns 动作序列
   */
  createSequence(
    actions: SignAction[],
    params: Partial<ActionParameters> = {}
  ): ActionSequenceItem[] {
    const defaultParams = {
      speed: 1.0,
      smoothness: 0.8,
      loop: false,
      easeIn: true,
      easeOut: true,
    };

    const sequence: ActionSequenceItem[] = [];
    let currentTime = 0;

    actions.forEach((action, index) => {
      const actionParams = { ...defaultParams, ...params };
      const duration = action.duration / actionParams.speed;

      sequence.push({
        action,
        params: actionParams,
        duration,
        startTime: currentTime,
      });

      currentTime += duration;
    });

    return sequence;
  }

  /**
   * 创建并行动作序列
   * @param actions - 多个动作数组
   * @param params - 动作参数（可选）
   * @returns 动作序列数组
   */
  createParallelSequences(
    actions: SignAction[][],
    params: Partial<ActionParameters> = {}
  ): ActionSequenceItem[][] {
    return actions.map(actionList => this.createSequence(actionList, params));
  }

  /**
   * 计算动作序列总时长
   * @param sequence - 动作序列
   * @returns 总时长（秒）
   */
  calculateTotalDuration(sequence: ActionSequenceItem[]): number {
    if (sequence.length === 0) return 0;
    const lastItem = sequence[sequence.length - 1];
    return lastItem.startTime + lastItem.duration;
  }

  /**
   * 拼接两个动作
   * @param action1 - 第一个动作
   * @param action2 - 第二个动作
   * @param transitionDuration - 过渡持续时间（秒）
   * @returns 过渡关键帧
   */
  blendActions(
    action1: SignAction,
    action2: SignAction,
    transitionDuration: number
  ): ActionKeyframe[] {
    const keyframes: ActionKeyframe[] = [];
    const numFrames = Math.floor(transitionDuration * 30); // 30 fps

    for (let i = 0; i < numFrames; i++) {
      const t = i / (numFrames - 1);
      const easedT = this.easeInOutQuad(t);

      // 插值手指姿态
      const fingerPoses = action1.fingerPoses.map((pose1, index) => {
        const pose2 = action2.fingerPoses[index];
        if (!pose2) return pose1;

        return {
          finger: pose1.finger,
          angles: {
            base: this.lerp(pose1.angles.base, pose2.angles.base, easedT),
            middle: this.lerp(pose1.angles.middle, pose2.angles.middle, easedT),
            distal: this.lerp(pose1.angles.distal, pose2.angles.distal, easedT),
          },
          state: t > 0.5 ? pose2.state : pose1.state,
        };
      });

      // 插值手掌姿态
      const rotation = new THREE.Quaternion().slerpQuaternions(
        action1.palmPose.rotation,
        action2.palmPose.rotation,
        easedT
      );

      const position = new THREE.Vector3().lerpVectors(
        action1.palmPose.position,
        action2.palmPose.position,
        easedT
      );

      keyframes.push({
        time: t * transitionDuration,
        fingerPoses,
        palmPose: { rotation, position },
      });
    }

    return keyframes;
  }

  /**
   * 融合多个动作
   * @param actions - 动作数组
   * @param weights - 权重数组（总和为1）
   * @returns 融合后的姿态
   */
  blendMultipleActions(
    actions: SignAction[],
    weights: number[]
  ): SignAction {
    if (actions.length !== weights.length) {
      throw new Error('动作数量和权重数量不匹配');
    }

    // 归一化权重
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);

    // 融合手指姿态
    const fingerPoses: FingerPose[] = [];
    const referenceFingers = ['thumb', 'index', 'middle', 'ring', 'little'] as const;

    referenceFingers.forEach(finger => {
      let baseAngle = 0, middleAngle = 0, distalAngle = 0;
      let state: FingerState = FingerState.EXTENDED;

      actions.forEach((action, index) => {
        const pose = action.fingerPoses.find(p => p.finger === finger);
        if (pose) {
          const weight = normalizedWeights[index];
          baseAngle += pose.angles.base * weight;
          middleAngle += pose.angles.middle * weight;
          distalAngle += pose.angles.distal * weight;
          state = weight > 0.5 ? pose.state : state;
        }
      });

      fingerPoses.push({
        finger,
        angles: { base: baseAngle, middle: middleAngle, distal: distalAngle },
        state,
      });
    });

    // 融合手掌姿态
    const palmPose = {
      rotation: new THREE.Quaternion(),
      position: new THREE.Vector3(),
    };

    actions.forEach((action, index) => {
      const weight = normalizedWeights[index];
      const tempRotation = new THREE.Quaternion().copy(action.palmPose.rotation);
      tempRotation.slerp(palmPose.rotation, weight);
      palmPose.rotation.copy(tempRotation);

      palmPose.position.addScaledVector(action.palmPose.position, weight);
    });

    return {
      id: 'blended',
      name: '融合动作',
      description: actions.map(a => a.name).join('+'),
      category: actions[0].category,
      fingerPoses,
      palmPose,
      tags: actions.flatMap(a => a.tags),
      duration: actions.reduce((max, a) => Math.max(max, a.duration), 0),
      keyframes: Math.max(...actions.map(a => a.keyframes)),
      difficulty: Math.round(actions.reduce((sum, a) => sum + a.difficulty, 0) / actions.length),
    };
  }

  /**
   * 应用节奏控制
   * @param sequence - 动作序列
   * @param rhythmConfig - 节奏配置
   * @returns 调整后的动作序列
   */
  applyRhythm(
    sequence: ActionSequenceItem[],
    rhythmConfig: RhythmConfig
  ): ActionSequenceItem[] {
    const adjustedSequence = sequence.map(item => ({ ...item }));

    adjustedSequence.forEach((item, index) => {
      let speedMultiplier = 1.0;
      const progress = index / (sequence.length - 1);

      switch (rhythmConfig.pattern) {
        case RhythmPattern.ACCELERATING:
          speedMultiplier = rhythmConfig.baseSpeed + progress * rhythmConfig.speedVariation;
          break;
        case RhythmPattern.DECELERATING:
          speedMultiplier = rhythmConfig.baseSpeed + (1 - progress) * rhythmConfig.speedVariation;
          break;
        case RhythmPattern.OSCILLATING:
          speedMultiplier = rhythmConfig.baseSpeed + Math.sin(progress * Math.PI) * rhythmConfig.speedVariation;
          break;
        case RhythmPattern.UNIFORM:
        default:
          speedMultiplier = rhythmConfig.baseSpeed;
          break;
      }

      item.params.speed = Math.max(0.5, Math.min(3.0, speedMultiplier));
      item.duration = item.action.duration / item.params.speed;
    });

    // 重新计算开始时间
    let currentTime = 0;
    adjustedSequence.forEach(item => {
      item.startTime = currentTime;
      currentTime += item.duration;
    });

    return adjustedSequence;
  }

  /**
   * 平滑插值
   * @param actionSequence - 动作序列
   * @param smoothness - 平滑度 (0-1)
   * @returns 插值后的完整关键帧序列
   */
  smoothInterpolate(
    actionSequence: ActionSequenceItem[],
    smoothness: number
  ): ActionKeyframe[] {
    const allKeyframes: ActionKeyframe[] = [];
    let currentTime = 0;

    actionSequence.forEach((item, index) => {
      // 为每个动作生成关键帧
      const numKeyframes = Math.floor(item.duration * 30); // 30 fps

      for (let i = 0; i < numKeyframes; i++) {
        const t = i / (numKeyframes - 1);
        const easedT = this.applyEasing(t, item.params.easeIn, item.params.easeOut);

        allKeyframes.push({
          time: currentTime + i / 30,
          fingerPoses: this.interpolateFingerPose(item.action.fingerPoses, easedT),
          palmPose: this.interpolatePalmPose(item.action.palmPose, easedT),
        });
      }

      currentTime += item.duration;

      // 添加过渡关键帧（如果不是最后一个动作）
      if (index < actionSequence.length - 1 && smoothness > 0) {
        const nextItem = actionSequence[index + 1];
        const transitionFrames = Math.floor(smoothness * 15); // 最多15帧过渡

        for (let i = 0; i < transitionFrames; i++) {
          const t = i / transitionFrames;
          const easedT = this.easeInOutQuad(t);

          allKeyframes.push({
            time: currentTime + i / 30,
            fingerPoses: this.interpolateBetweenActions(
              item.action.fingerPoses,
              nextItem.action.fingerPoses,
              easedT
            ),
            palmPose: this.interpolateBetweenPalmPoses(
              item.action.palmPose,
              nextItem.action.palmPose,
              easedT
            ),
          });
        }

        currentTime += transitionFrames / 30;
      }
    });

    return allKeyframes;
  }

  /**
   * 插值手指姿态
   * @param poses - 手指姿态数组
   * @param t - 插值参数
   * @returns 插值后的姿态
   */
  private interpolateFingerPose(poses: FingerPose[], t: number): FingerPose[] {
    return poses.map(pose => ({
      finger: pose.finger,
      angles: {
        base: this.lerp(0, pose.angles.base, t),
        middle: this.lerp(0, pose.angles.middle, t),
        distal: this.lerp(0, pose.angles.distal, t),
      },
      state: t > 0.5 ? pose.state : this.getDefaultState(pose.finger),
    }));
  }

  /**
   * 插值手掌姿态
   * @param pose - 手掌姿态
   * @param t - 插值参数
   * @returns 插值后的姿态
   */
  private interpolatePalmPose(pose: PalmPose, t: number): PalmPose {
    const fromRotation = new THREE.Quaternion().set(0, 0, 0, 1);
    const fromPosition = new THREE.Vector3(0, 0, 0);

    return {
      rotation: new THREE.Quaternion().slerpQuaternions(fromRotation, pose.rotation, t),
      position: new THREE.Vector3().lerpVectors(fromPosition, pose.position, t),
    };
  }

  /**
   * 插值两个动作之间的手指姿态
   * @param poses1 - 第一个动作的姿态
   * @param poses2 - 第二个动作的姿态
   * @param t - 插值参数
   * @returns 插值后的姿态
   */
  private interpolateBetweenActions(
    poses1: FingerPose[],
    poses2: FingerPose[],
    t: number
  ): FingerPose[] {
    return poses1.map((pose1, index) => {
      const pose2 = poses2[index];
      return {
        finger: pose1.finger,
        angles: {
          base: this.lerp(pose1.angles.base, pose2.angles.base, t),
          middle: this.lerp(pose1.angles.middle, pose2.angles.middle, t),
          distal: this.lerp(pose1.angles.distal, pose2.angles.distal, t),
        },
        state: t > 0.5 ? pose2.state : pose1.state,
      };
    });
  }

  /**
   * 插值两个动作之间的手掌姿态
   * @param pose1 - 第一个动作的姿态
   * @param pose2 - 第二个动作的姿态
   * @param t - 插值参数
   * @returns 插值后的姿态
   */
  private interpolateBetweenPalmPoses(
    pose1: PalmPose,
    pose2: PalmPose,
    t: number
  ): PalmPose {
    return {
      rotation: new THREE.Quaternion().slerpQuaternions(pose1.rotation, pose2.rotation, t),
      position: new THREE.Vector3().lerpVectors(pose1.position, pose2.position, t),
    };
  }

  /**
   * 应用缓动函数
   * @param t - 插值参数
   * @param easeIn - 是否ease-in
   * @param easeOut - 是否ease-out
   * @returns 缓动后的值
   */
  private applyEasing(t: number, easeIn: boolean, easeOut: boolean): number {
    if (easeIn && easeOut) {
      return this.easeInOutQuad(t);
    } else if (easeIn) {
      return this.easeInQuad(t);
    } else if (easeOut) {
      return this.easeOutQuad(t);
    }
    return t; // Linear
  }

  /**
   * Ease-in-out quad
   */
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Ease-in quad
   */
  private easeInQuad(t: number): number {
    return t * t;
  }

  /**
   * Ease-out quad
   */
  private easeOutQuad(t: number): number {
    return 1 - Math.pow(1 - t, 2);
  }

  /**
   * 线性插值
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * 获取默认手指状态
   */
  private getDefaultState(finger: string): any {
    return FingerState.EXTENDED;
  }

  /**
   * 创建合成配置
   * @param sequence - 动作序列
   * @param config - 部分配置
   * @returns 完整配置
   */
  createCompositionConfig(
    sequence: ActionSequenceItem[],
    config: Partial<CompositionConfig> = {}
  ): CompositionConfig {
    const partialResult: Partial<CompositionConfig> = {
      actions: sequence,
      totalDuration: this.calculateTotalDuration(sequence),
      useTransitions: config.useTransitions ?? true,
      transitionDuration: config.transitionDuration ?? 0.3,
      speed: config.speed ?? 1.0,
    };

    return {
      ...partialResult,
      actions: sequence,
      totalDuration: this.calculateTotalDuration(sequence),
      useTransitions: partialResult.useTransitions!,
      transitionDuration: partialResult.transitionDuration!,
      speed: partialResult.speed!,
    };
  }

  /**
   * 验证动作序列
   * @param sequence - 动作序列
   * @returns 是否有效
   */
  validateSequence(sequence: ActionSequenceItem[]): boolean {
    if (sequence.length === 0) return false;

    // 检查是否所有动作都有有效的duration
    const hasInvalidDuration = sequence.some(item => item.duration <= 0);
    if (hasInvalidDuration) return false;

    // 检查参数是否有效
    const hasInvalidParams = sequence.some(item => {
      const { speed, smoothness } = item.params;
      return speed < 0.1 || speed > 3.0 || smoothness < 0 || smoothness > 1;
    });
    if (hasInvalidParams) return false;

    return true;
  }

  /**
   * 优化动作序列（合并相似动作）
   * @param sequence - 动作序列
   * @param similarityThreshold - 相似度阈值
   * @returns 优化后的序列
   */
  optimizeSequence(
    sequence: ActionSequenceItem[],
    similarityThreshold: number = 0.9
  ): ActionSequenceItem[] {
    const optimized: ActionSequenceItem[] = [];

    sequence.forEach(item => {
      const lastItem = optimized[optimized.length - 1];

      if (lastItem) {
        const similarity = this.calculateSimilarity(lastItem.action, item.action);
        if (similarity > similarityThreshold) {
          // 合并相似动作，使用其中一个
          if (item.duration > lastItem.duration) {
            optimized[optimized.length - 1] = item;
          }
          return;
        }
      }

      optimized.push(item);
    });

    return optimized;
  }

  /**
   * 计算两个动作的相似度
   * @param action1 - 动作1
   * @param action2 - 动作2
   * @returns 相似度 (0-1)
   */
  private calculateSimilarity(action1: SignAction, action2: SignAction): number {
    let similarity = 0;

    // 比较手指姿态
    action1.fingerPoses.forEach((pose1, index) => {
      const pose2 = action2.fingerPoses[index];
      if (pose2 && pose1.finger === pose2.finger) {
        const angleDiff = (
          Math.abs(pose1.angles.base - pose2.angles.base) +
          Math.abs(pose1.angles.middle - pose2.angles.middle) +
          Math.abs(pose1.angles.distal - pose2.angles.distal)
        ) / 270;
        similarity += (1 - angleDiff) / 5;
      }
    });

    // 比较手掌姿态
    const rotationDiff = Math.abs(
      action1.palmPose.rotation.angleTo(action2.palmPose.rotation)
    );
    const rotationSimilarity = 1 - rotationDiff / Math.PI;
    similarity += rotationSimilarity * 0.5;

    return Math.max(0, Math.min(similarity, 1));
  }
}

// 导出单例实例
export const signActionComposer = new SignActionComposer();
