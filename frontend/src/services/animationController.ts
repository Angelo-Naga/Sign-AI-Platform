/**
 * 手语动画控制器
 * 管理动作序列、动画队列调度、过渡动画和播放控制
 */

import * as THREE from 'three';
import type { SignAction, ActionParameters, FingerPose, PalmPose } from '../data/signActions';

/**
 * 动作队列项
 */
interface AnimationQueueItem {
  /** 动作 */
  action: SignAction;
  /** 动作参数 */
  params: ActionParameters;
  /** 是否有过渡 */
  transition?: boolean;
  /** 过渡时长（秒） */
  transitionDuration?: number;
}

/**
 * 动画状态
 */
export enum AnimationState {
  /** 空闲 */
  IDLE = 'idle',
  /** 播放中 */
  PLAYING = 'playing',
  /** 暂停 */
  PAUSED = 'paused',
  /** 过渡中 */
  TRANSITIONING = 'transitioning',
}

/**
 * 动画进度信息
 */
export interface AnimationProgress {
  /** 当前动作 */
  currentAction: string;
  /** 进度 (0-1) */
  progress: number;
  /** 剩余时间（秒） */
  remainingTime: number;
  /** 总时长（秒） */
  totalTime: number;
  /** 队列中的动作数量 */
  queueLength: number;
}

/**
 * 动画完成回调
 */
type AnimationCompleteCallback = (actionId: string) => void;

/**
 * 动画进度回调
 */
type AnimationProgressCallback = (progress: AnimationProgress) => void;

/**
 * 手语动画控制器类
 */
class AnimationController {
  private mixer: THREE.AnimationMixer | null = null;
  private currentAction: THREE.AnimationAction | null = null;
  private queue: AnimationQueueItem[] = [];
  private state: AnimationState = AnimationState.IDLE;
  private playbackSpeed: number = 1.0;
  private isPaused: boolean = false;
  private isLooping: boolean = false;
  private onCompleteCallbacks: AnimationCompleteCallback[] = [];
  private onProgressCallbacks: AnimationProgressCallback[] = [];
  private startTime: number = 0;
  private pausedTime: number = 0;
  private currentTime: number = 0;
  private actionDuration: number = 0;
  private lastFrameTime: number = 0;

  /**
   * 设置动画混合器
   * @param mixer - Three.js动画混合器
   */
  setMixer(mixer: THREE.AnimationMixer): void {
    this.mixer = mixer;
    this.state = AnimationState.IDLE;
  }

  /**
   * 添加动作到队列
   * @param action - 手语动作
   * @param params - 动作参数
   * @param transition - 是否有过渡
   * @param transitionDuration - 过渡持续时间
   */
  addToQueue(
    action: SignAction,
    params: Partial<ActionParameters> = {},
    transition: boolean = true,
    transitionDuration: number = 0.3
  ): void {
    const finalParams = {
      speed: params.speed ?? 1.0,
      smoothness: params.smoothness ?? 0.8,
      loop: params.loop ?? false,
      easeIn: params.easeIn ?? true,
      easeOut: params.easeOut ?? true,
    };

    this.queue.push({
      action,
      params: finalParams,
      transition,
      transitionDuration,
    });

    // 如果当前空闲，开始播放队列
    if (this.state === AnimationState.IDLE) {
      this.playNext();
    }
  }

  /**
   * 播放下一个动作
   */
  private playNext(): void {
    if (this.queue.length === 0) {
      this.state = AnimationState.IDLE;
      this.currentAction = null;
      return;
    }

    const item = this.queue.shift()!;
    const { action, params, transition, transitionDuration } = item;

    this.playAction(action, params, transition, transitionDuration);
  }

  /**
   * 播放指定动作
   * @param action - 手语动作
   * @param params - 动作参数
   * @param transition - 是否有过渡
   * @param transitionDuration - 过渡持续时间
   */
  playAction(
    action: SignAction,
    params: ActionParameters,
    transition: boolean = true,
    transitionDuration: number = 0.3
  ): void {
    if (!this.mixer) {
      console.error('动画混合器未设置');
      return;
    }

    this.state = AnimationState.TRANSITIONING;
    this.currentTime = 0;
    this.actionDuration = action.duration / params.speed;
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.isPaused = false;
    this.isLooping = params.loop;

    // 创建动画clip（这里需要实际的clip数据，目前使用占位）
    const clip = this.createClipFromAction(action);
    const newAction = this.mixer.clipAction(clip);

    // 设置过渡
    if (this.currentAction && transition) {
      this.currentAction.fadeOut(transitionDuration);
      newAction.fadeIn(transitionDuration);
    }

    // 设置循环
    if (params.loop) {
      newAction.setLoop(THREE.LoopRepeat, Infinity);
    } else {
      newAction.setLoop(THREE.LoopOnce);
    }

    // 设置播放速度
    newAction.setEffectiveTimeScale(params.speed);

    // 启用平滑过渡
    newAction.enabled = true;
    newAction.clampWhenFinished = !params.loop;

    // 停止并移除之前的动作
    if (this.currentAction) {
      this.currentAction.stop();
    }

    this.currentAction = newAction;
    this.currentAction.play();
    this.state = AnimationState.PLAYING;

    // 通知开始
    this.notifyProgress({
      currentAction: action.id,
      progress: 0,
      remainingTime: this.actionDuration,
      totalTime: this.actionDuration,
      queueLength: this.queue.length,
    });
  }

  /**
   * 从动作数据创建动画clip
   * @param action - 手语动作
   * @returns THREE.AnimationClip
   */
  private createClipFromAction(action: SignAction): THREE.AnimationClip {
    // 这里创建一个占位的clip
    // 实际使用时需要根据骨骼名称和关键帧数据创建真实的tracks
    const tracks: THREE.KeyframeTrack[] = [];
    const duration = action.duration;

    // 手指骨骼名称
    const fingers = ['thumb', 'index', 'middle', 'ring', 'little'];
    const joints = ['_01', '_02', '_03'];

    fingers.forEach(finger => {
      joints.forEach(joint => {
        const boneName = `${finger}${joint}`;

        // 旋转轨道
        tracks.push(
          new THREE.QuaternionKeyframeTrack(
            `${boneName}.quaternion`,
            [0, duration / 2, duration],
            [0, 0, 0, 1, 0.5, 0.5, 0.5, 0.5, 0, 0, 0, 1]
          )
        );
      });
    });

    // 手掌骨骼轨道
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        'wrist.quaternion',
        [0, duration / 2, duration],
        [0, 0, 0, 1, 0, 0, 0.5, 0.866, 0, 0, 0, 1]
      )
    );

    tracks.push(
      new THREE.VectorKeyframeTrack(
        'wrist.position',
        [0, duration / 2, duration],
        [0, 0, 0, 0, 0.5, 0, 0, 0, 0]
      )
    );

    return new THREE.AnimationClip(action.id, duration, tracks);
  }

  /**
   * 更新动画状态
   * @param delta - 时间增量（秒）
   */
  update(delta: number): void {
    if (!this.mixer || !this.currentAction) {
      return;
    }

    if (!this.isPaused && this.state === AnimationState.PLAYING) {
      // 更新混合器
      this.mixer.update(delta * this.playbackSpeed);

      // 更新当前时间
      this.currentTime += delta * this.playbackSpeed;
      const progress = Math.min(this.currentTime / this.actionDuration, 1);

      // 通知进度
      this.notifyProgress({
        currentAction: this.currentAction.getClip().name,
        progress,
        remainingTime: this.actionDuration - this.currentTime,
        totalTime: this.actionDuration,
        queueLength: this.queue.length,
      });

      // 检查是否完成
      if (!this.isLooping && progress >= 1) {
        this.onActionComplete();
      }
    }
  }

  /**
   * 动作完成处理
   */
  private onActionComplete(): void {
    const actionId = this.currentAction?.getClip().name || '';

    // 通知回调
    this.onCompleteCallbacks.forEach(callback => callback(actionId));

    // 播放下一个动作
    if (this.queue.length > 0) {
      this.playNext();
    } else {
      this.state = AnimationState.IDLE;
    }
  }

  /**
   * 暂停动画
   */
  pause(): void {
    if (this.state === AnimationState.PLAYING) {
      this.isPaused = true;
      this.pausedTime = performance.now();
      this.state = AnimationState.PAUSED;

      if (this.currentAction) {
        this.currentAction.paused = true;
      }
    }
  }

  /**
   * 恢复动画
   */
  resume(): void {
    if (this.state === AnimationState.PAUSED) {
      this.isPaused = false;
      this.lastFrameTime = performance.now();
      this.state = AnimationState.PLAYING;

      if (this.currentAction) {
        this.currentAction.paused = false;
      }
    }
  }

  /**
   * 停止动画
   */
  stop(): void {
    if (this.currentAction) {
      this.currentAction.stop();
      this.currentAction = null;
    }

    this.queue = [];
    this.state = AnimationState.IDLE;
    this.currentTime = 0;
    this.isPaused = false;
    this.isLooping = false;
  }

  /**
   * 跳转到指定时间
   * @param time - 时间（秒）
   */
  seekTo(time: number): void {
    if (!this.currentAction) return;

    this.currentTime = Math.max(0, Math.min(time, this.actionDuration));
    this.currentAction.time = this.currentTime;

    // 通知进度
    this.notifyProgress({
      currentAction: this.currentAction.getClip().name,
      progress: this.currentTime / this.actionDuration,
      remainingTime: this.actionDuration - this.currentTime,
      totalTime: this.actionDuration,
      queueLength: this.queue.length,
    });
  }

  /**
   * 设置播放速度
   * @param speed - 速度倍率 (0.1-3.0)
   */
  setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.1, Math.min(speed, 3.0));

    if (this.currentAction) {
      this.currentAction.setEffectiveTimeScale(this.playbackSpeed);
      // 更新动作时长（需要调整当前时间）
      const originalDuration = this.actionDuration * (this.currentTime / this.actionDuration);
      this.actionDuration = originalDuration / this.playbackSpeed;
    }
  }

  /**
   * 获取当前状态
   */
  getState(): AnimationState {
    return this.state;
  }

  /**
   * 获取播放速度
   */
  getPlaybackSpeed(): number {
    return this.playbackSpeed;
  }

  /**
   * 是否暂停
   */
  isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * 是否循环
   */
  isLoopingState(): boolean {
    return this.isLooping;
  }

  /**
   * 获取当前动作
   */
  getCurrentAction(): THREE.AnimationAction | null {
    return this.currentAction;
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * 注册完成回调
   * @param callback - 回调函数
   */
  onComplete(callback: AnimationCompleteCallback): void {
    this.onCompleteCallbacks.push(callback);
  }

  /**
   * 移除完成回调
   * @param callback - 回调函数
   */
  removeCompleteCallback(callback: AnimationCompleteCallback): void {
    const index = this.onCompleteCallbacks.indexOf(callback);
    if (index > -1) {
      this.onCompleteCallbacks.splice(index, 1);
    }
  }

  /**
   * 注册进度回调
   * @param callback - 回调函数
   */
  onProgress(callback: AnimationProgressCallback): void {
    this.onProgressCallbacks.push(callback);
  }

  /**
   * 移除进度回调
   * @param callback - 回调函数
   */
  removeProgressCallback(callback: AnimationProgressCallback): void {
    const index = this.onProgressCallbacks.indexOf(callback);
    if (index > -1) {
      this.onProgressCallbacks.splice(index, 1);
    }
  }

  /**
   * 通知进度
   * @param progress - 进度信息
   */
  private notifyProgress(progress: AnimationProgress): void {
    this.onProgressCallbacks.forEach(callback => callback(progress));
  }

  /**
   * 销毁控制器
   */
  dispose(): void {
    this.stop();
    this.onCompleteCallbacks = [];
    this.onProgressCallbacks = [];
    this.mixer = null;
  }
}

// 导出单例实例
export const animationController = new AnimationController();

/**
 * 创建动作间过渡
 * @param fromAction - 起始动作
 * @param toAction - 目标动作
 * @param duration - 过渡持续时间
 * @returns 过渡clip
 */
export function createTransitionClip(
  fromAction: SignAction,
  toAction: SignAction,
  duration: number
): THREE.AnimationClip {
  // 创建过渡关键帧
  const tracks: THREE.KeyframeTrack[] = [];

  // 手指过渡
  const fingers = ['thumb', 'index', 'middle', 'ring', 'little'];
  const joints = ['_01', '_02', '_03'];

  fingers.forEach(finger => {
    joints.forEach(joint => {
      const boneName = `${finger}${joint}`;

      // 起始姿态和结束姿态
      const startPose = fromAction.fingerPoses.find(fp => fp.finger === finger);
      const endPose = toAction.fingerPoses.find(fp => fp.finger === finger);

      if (startPose && endPose) {
        tracks.push(
          new THREE.QuaternionKeyframeTrack(
            `${boneName}.quaternion`,
            [0, duration],
            [0, 0, 0, 1, 0, 0, 0, 1]
          )
        );
      }
    });
  });

  // 手掌过渡
  tracks.push(
    new THREE.QuaternionKeyframeTrack(
      'wrist.quaternion',
      [0, duration],
      [
        fromAction.palmPose.rotation.x,
        fromAction.palmPose.rotation.y,
        fromAction.palmPose.rotation.z,
        fromAction.palmPose.rotation.w,
        toAction.palmPose.rotation.x,
        toAction.palmPose.rotation.y,
        toAction.palmPose.rotation.z,
        toAction.palmPose.rotation.w,
      ]
    )
  );

  return new THREE.AnimationClip('transition', duration, tracks);
}

/**
 * 计算动作间相似度
 * @param action1 - 动作1
 * @param action2 - 动作2
 * @returns 相似度 (0-1)
 */
export function calculateActionSimilarity(
  action1: SignAction,
  action2: SignAction
): number {
  let similarity = 0;

  // 比较手指姿态
  action1.fingerPoses.forEach((pose1, index) => {
    const pose2 = action2.fingerPoses[index];
    if (pose2 && pose1.finger === pose2.finger) {
      const angleDiff = (
        Math.abs(pose1.angles.base - pose2.angles.base) +
        Math.abs(pose1.angles.middle - pose2.angles.middle) +
        Math.abs(pose1.angles.distal - pose2.angles.distal)
      ) / 270; // 最大角度差约为270度
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