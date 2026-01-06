/**
 * 手语动作库
 * 定义手语手势的基本动作数据、关键帧序列和动作参数
 */

import * as THREE from 'three';

/**
 * 手指状态
 */
export enum FingerState {
  /** 完全伸展 */
  EXTENDED = 'extended',
  /** 部分弯曲 */
  BENT = 'bent',
  /** 完全弯曲 */
  FOLDED = 'folded',
  /** 旋转 */
  ROTATED = 'rotated',
}

/**
 * 动作类别
 */
export enum ActionCategory {
  /** 手指基础动作 */
  FINGER_BASICS = 'finger_basics',
  /** 手掌动作 */
  PALM = 'palm',
  /** 握力动作 */
  GRIP = 'grip',
  /** 手势组合 */
  COMBINATION = 'combination',
  /** 动态动作 */
  DYNAMIC = 'dynamic',
}

/**
 * 手指关节角度（度）
 */
export interface FingerJointAngles {
  /** 根关节 */
  base: number;
  /** 中间关节 */
  middle: number;
  /** 末梢关节 */
  distal: number;
}

/**
 * 手指姿态数据
 */
export interface FingerPose {
  /** 手指名称 */
  finger: 'thumb' | 'index' | 'middle' | 'ring' | 'little';
  /** 关节角度 */
  angles: FingerJointAngles;
  /** 扩展角度 */
  spreadAngle?: number;
  /** 手指状态 */
  state: FingerState;
}

/**
 * 手掌姿态数据
 */
export interface PalmPose {
  /** 手掌旋转（四元数） */
  rotation: THREE.Quaternion;
  /** 手掌位置 */
  position: THREE.Vector3;
  /** 手掌倾斜角度 */
  tilt?: number;
  /** 手掌开合程度 */
  openness?: number;
}

/**
 * 单个手势动作
 */
export interface SignAction {
  /** 动作ID */
  id: string;
  /** 动作名称 */
  name: string;
  /** 动作描述 */
  description: string;
  /** 动作类别 */
  category: ActionCategory;
  /** 手指姿态数组 */
  fingerPoses: FingerPose[];
  /** 手掌姿态 */
  palmPose: PalmPose;
  /** 标签 */
  tags: string[];
  /** 持续时间（秒） */
  duration: number;
  /** 关键帧数量 */
  keyframes: number;
  /** 动作难度 (1-5) */
  difficulty: number;
}

/**
 * 动作关键帧
 */
export interface ActionKeyframe {
  /** 关键帧时间 */
  time: number;
  /** 手指姿态 */
  fingerPoses: FingerPose[];
  /** 手掌姿态 */
  palmPose: PalmPose;
}

/**
 * 动作参数
 */
export interface ActionParameters {
  /** 播放速度 (0.5-2.0) */
  speed: number;
  /** 平滑度 (0-1) */
  smoothness: number;
  /** 是否循环 */
  loop: boolean;
  /** 是否 ease-in */
  easeIn: boolean;
  /** 是否 ease-out */
  easeOut: boolean;
}

/**
 * 基础手指姿态定义
 */
const BASE_FINGER_POSES: { [finger: string]: FingerJointAngles } = {
  thumb: { base: 0, middle: 0, distal: 0 },
  index: { base: 0, middle: 0, distal: 0 },
  middle: { base: 0, middle: 0, distal: 0 },
  ring: { base: 0, middle: 0, distal: 0 },
  little: { base: 0, middle: 0, distal: 0 },
};

/**
 * 创建手指姿态
 */
function createFingerPose(
  finger: 'thumb' | 'index' | 'middle' | 'ring' | 'little',
  baseAngle: number,
  middleAngle: number,
  distalAngle: number,
  state: FingerState
): FingerPose {
  return {
    finger,
    angles: { base: baseAngle, middle: middleAngle, distal: distalAngle },
    state,
  };
}

/**
 * 创建手掌姿态
 */
function createPalmPose(
  rotation: [number, number, number, number],
  position: [number, number, number],
  openness: number = 1
): PalmPose {
  return {
    rotation: new THREE.Quaternion(...rotation),
    position: new THREE.Vector3(...position),
    openness,
  };
}

/**
 * 基础手语动作库
 */
export const SIGN_ACTIONS: SignAction[] = [
  {
    id: '手掌',
    name: '手掌',
    description: '所有手指完全伸展，手掌平整',
    category: ActionCategory.FINGER_BASICS,
    fingerPoses: [
      createFingerPose('thumb', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('index', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('middle', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('ring', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('little', 0, 0, 0, FingerState.EXTENDED),
    ],
    palmPose: createPalmPose([0, 0, 0, 1], [0, 0, 0], 1),
    tags: ['基础', '五指'],
    duration: 1.0,
    keyframes: 30,
    difficulty: 1,
  },
  {
    id: '拳头',
    name: '拳头',
    description: '所有手指完全弯曲，握成拳头',
    category: ActionCategory.GRIP,
    fingerPoses: [
      createFingerPose('thumb', 45, 60, 45, FingerState.FOLDED),
      createFingerPose('index', 90, 90, 90, FingerState.FOLDED),
      createFingerPose('middle', 90, 90, 90, FingerState.FOLDED),
      createFingerPose('ring', 90, 90, 90, FingerState.FOLDED),
      createFingerPose('little', 90, 90, 90, FingerState.FOLDED),
    ],
    palmPose: createPalmPose([0, 0, 0, 1], [0, 0, 0], 0),
    tags: ['握力', '五指'],
    duration: 0.8,
    keyframes: 24,
    difficulty: 1,
  },
  {
    id: 'ok手势',
    name: 'OK手势',
    description: '拇指和食指形成圆圈，其他手指伸展',
    category: ActionCategory.COMBINATION,
    fingerPoses: [
      createFingerPose('thumb', 30, 45, 30, FingerState.BENT),
      createFingerPose('index', 30, 45, 30, FingerState.BENT),
      createFingerPose('middle', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('ring', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('little', 0, 0, 0, FingerState.EXTENDED),
    ],
    palmPose: createPalmPose([0, 0, 0, 1], [0, 0, 0], 0.8),
    tags: ['手势', '组合'],
    duration: 1.0,
    keyframes: 30,
    difficulty: 2,
  },
  {
    id: '竖大拇指',
    name: '竖大拇指',
    description: '拇指向上竖起，其他手指弯曲',
    category: ActionCategory.COMBINATION,
    fingerPoses: [
      createFingerPose('thumb', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('index', 90, 90, 90, FingerState.FOLDED),
      createFingerPose('middle', 90, 90, 90, FingerState.FOLDED),
      createFingerPose('ring', 90, 90, 90, FingerState.FOLDED),
      createFingerPose('little', 90, 90, 90, FingerState.FOLDED),
    ],
    palmPose: createPalmPose([0, 0, 0, 1], [0, 0, 0], 0.2),
    tags: ['手势', '拇指'],
    duration: 1.0,
    keyframes: 30,
    difficulty: 1,
  },
  {
    id: '指向',
    name: '指向',
    description: '食指向上伸展，其他手指弯曲',
    category: ActionCategory.COMBINATION,
    fingerPoses: [
      createFingerPose('thumb', 90, 90, 90, FingerState.FOLDED),
      createFingerPose('index', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('middle', 90, 90, 90, FingerState.FOLDED),
      createFingerPose('ring', 90, 90, 90, FingerState.FOLDED),
      createFingerPose('little', 90, 90, 90, FingerState.FOLDED),
    ],
    palmPose: createPalmPose([0, 0, 0, 1], [0, 0, 0], 0.2),
    tags: ['手势', '食指'],
    duration: 1.0,
    keyframes: 30,
    difficulty: 1,
  },
  {
    id: 'V字手势',
    name: 'V字手势',
    description: '食指和中指伸展呈V形，其他手指弯曲',
    category: ActionCategory.COMBINATION,
    fingerPoses: [
      createFingerPose('thumb', 90, 90, 90, FingerState.FOLDED),
      createFingerPose('index', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('middle', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('ring', 90, 90, 90, FingerState.FOLDED),
      createFingerPose('little', 90, 90, 90, FingerState.FOLDED),
    ],
    palmPose: createPalmPose([0, 0, 0, 1], [0, 0, 0], 0.4),
    tags: ['手势', '胜利'],
    duration: 1.0,
    keyframes: 30,
    difficulty: 2,
  },
  {
    id: '手掌向左',
    name: '手掌向左',
    description: '手掌朝向左方',
    category: ActionCategory.PALM,
    fingerPoses: [
      createFingerPose('thumb', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('index', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('middle', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('ring', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('little', 0, 0, 0, FingerState.EXTENDED),
    ],
    palmPose: createPalmPose([0, 0.707, 0, 0.707], [0, 0, 0], 1),
    tags: ['方向', '手掌'],
    duration: 1.0,
    keyframes: 30,
    difficulty: 1,
  },
  {
    id: '手掌向右',
    name: '手掌向右',
    description: '手掌朝向右方',
    category: ActionCategory.PALM,
    fingerPoses: [
      createFingerPose('thumb', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('index', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('middle', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('ring', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('little', 0, 0, 0, FingerState.EXTENDED),
    ],
    palmPose: createPalmPose([0, -0.707, 0, 0.707], [0, 0, 0], 1),
    tags: ['方向', '手掌'],
    duration: 1.0,
    keyframes: 30,
    difficulty: 1,
  },
  {
    id: '挥手',
    name: '挥手',
    description: '手掌左右挥手致意',
    category: ActionCategory.DYNAMIC,
    fingerPoses: [
      createFingerPose('thumb', 30, 30, 30, FingerState.BENT),
      createFingerPose('index', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('middle', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('ring', 0, 0, 0, FingerState.EXTENDED),
      createFingerPose('little', 0, 0, 0, FingerState.EXTENDED),
    ],
    palmPose: createPalmPose([0, 0, 0, 1], [0, 0, 0], 1),
    tags: ['动态', '问候'],
    duration: 2.0,
    keyframes: 60,
    difficulty: 2,
  },
  {
    id: '握手',
    name: '握手',
    description: '张开手掌然后握紧',
    category: ActionCategory.GRIP,
    fingerPoses: [
      createFingerPose('thumb', 45, 60, 45, FingerState.FOLDED),
      createFingerPose('index', 90, 90, 90, FingerState.FOLDED),
      createFingerPose('middle', 90, 90, 90, FingerState.FOLDED),
      createFingerPose('ring', 90, 90, 90, FingerState.FOLDED),
      createFingerPose('little', 90, 90, 90, FingerState.FOLDED),
    ],
    palmPose: createPalmPose([0, 0, 0, 1], [0, 0, 0], 0),
    tags: ['握力', '动态'],
    duration: 1.5,
    keyframes: 45,
    difficulty: 2,
  },
];

/**
 * 默认动作参数
 */
export const DEFAULT_ACTION_PARAMS: ActionParameters = {
  speed: 1.0,
  smoothness: 0.8,
  loop: false,
  easeIn: true,
  easeOut: true,
};

/**
 * 根据ID获取动作
 */
export function getActionById(id: string): SignAction | undefined {
  return SIGN_ACTIONS.find(action => action.id === id);
}

/**
 * 根据类别获取动作
 */
export function getActionsByCategory(category: ActionCategory): SignAction[] {
  return SIGN_ACTIONS.filter(action => action.category === category);
}

/**
 * 搜索动作
 */
export function searchActions(query: string): SignAction[] {
  const lowerQuery = query.toLowerCase();
  return SIGN_ACTIONS.filter(
    action =>
      action.name.toLowerCase().includes(lowerQuery) ||
      action.description.toLowerCase().includes(lowerQuery) ||
      action.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * 根据难度过滤动作
 */
export function getActionsByDifficulty(difficulty: number): SignAction[] {
  return SIGN_ACTIONS.filter(action => action.difficulty <= difficulty);
}

/**
 * 插值生成关键帧序列
 */
export function interpolateKeyframes(
  startPose: PalmPose,
  endPose: PalmPose,
  startFingerPoses: FingerPose[],
  endFingerPoses: FingerPose[],
  numFrames: number
): ActionKeyframe[] {
  const keyframes: ActionKeyframe[] = [];

  for (let i = 0; i < numFrames; i++) {
    const t = i / (numFrames - 1);
    
    // 插值手掌旋转
    const rotation = new THREE.Quaternion().slerpQuaternions(
      startPose.rotation,
      endPose.rotation,
      t
    );
    
    // 插值手掌位置
    const position = new THREE.Vector3().lerpVectors(
      startPose.position,
      endPose.position,
      t
    );

    // 插值手指姿态
    const fingerPoses = startFingerPoses.map((startFinger, index) => {
      const endFinger = endFingerPoses[index];
      return {
        finger: startFinger.finger,
        angles: {
          base: startFinger.angles.base + (endFinger.angles.base - startFinger.angles.base) * t,
          middle: startFinger.angles.middle + (endFinger.angles.middle - startFinger.angles.middle) * t,
          distal: startFinger.angles.distal + (endFinger.angles.distal - startFinger.angles.distal) * t,
        },
        state: t > 0.5 ? endFinger.state : startFinger.state,
      };
    });

    keyframes.push({
      time: t,
      fingerPoses,
      palmPose: { rotation, position },
    });
  }

  return keyframes;
}

/**
 * 应用ease函数
 */
export function applyEaseFunction(
  t: number,
  easeIn: boolean,
  easeOut: boolean
): number {
  if (easeIn && easeOut) {
    // Ease-in-out
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  } else if (easeIn) {
    // Ease-in (Quadratic)
    return t * t;
  } else if (easeOut) {
    // Ease-out (Quadratic)
    return 1 - Math.pow(1 - t, 2);
  }
  return t; // Linear
}