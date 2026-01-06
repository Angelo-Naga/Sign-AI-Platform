/**
 * 3D手部模型加载器
 * 用于加载GLTF格式的3D手部模型，配置材质、骨骼动画和模型优化
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// 调试日志
const DEBUG_3D_LOADER = true;
const logDebug = (message: string, data?: any) => {
  if (DEBUG_3D_LOADER) {
    console.log(`[3D Hand Loader] ${message}`, data || '');
  }
};

/**
 * 手部模型配置
 */
export interface HandModelConfig {
  /** 模型文件URL */
  modelUrl: string;
  /** 材质颜色 */
  color?: string;
  /** 皮肤色 */
  skinColor?: string;
  /** 是否启用阴影 */
  shadows?: boolean;
  /** 材质粗糙度 */
  roughness?: number;
  /** 材质金属度 */
  metalness?: number;
  /** 压缩纹理路径 */
  dracoPath?: string;
}

/**
 * 加载的手部模型
 */
export interface LoadedHandModel {
  /** 场景实例 */
  scene: THREE.Group;
  /** 骨骼引用 */
  bones: Map<string, THREE.Bone>;
  /** 动画混合器 */
  mixer: THREE.AnimationMixer;
  /** 原始模型数据 */
  gltf: any;
  /** 模型边界框 */
  boundingBox: THREE.Box3;
}

/**
 * 模型加载器类
 */
class HandModelLoader {
  private loader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private modelCache: Map<string, LoadedHandModel> = new Map();
  private defaultConfig: Partial<HandModelConfig> = {
    color: '#e8b89d',
    skinColor: '#f5deb3',
    shadows: true,
    roughness: 0.7,
    metalness: 0.1,
    dracoPath: '/draco/',
  };

  constructor() {
    this.loader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    
    // 配置Draco解压器
    this.dracoLoader.setDecoderPath(this.defaultConfig.dracoPath!);
    this.loader.setDRACOLoader(this.dracoLoader);
  }

  /**
   * 加载手部模型
   * @param config - 模型配置
   * @returns Promise<LoadedHandModel>
   */
  async loadModel(config: HandModelConfig): Promise<LoadedHandModel> {
    const cacheKey = config.modelUrl;
    logDebug('开始加载3D手部模型', { modelUrl: config.modelUrl });

    // 检查缓存
    if (this.modelCache.has(cacheKey)) {
      logDebug('从缓存加载模型', cacheKey);
      return this.modelCache.get(cacheKey)!;
    }

    try {
      // 加载GLTF模型
      logDebug('调用 GLTFLoader 加载模型文件...');
      const gltf = await this.loadGLTF(config.modelUrl);
      logDebug('模型文件加载成功', { scene: !!gltf.scene, animations: gltf.animations?.length });
      const scene = gltf.scene;
      
      // 提取骨骼
      const bones = this.extractBones(scene);
      
      // 配置材质
      this.configureMaterials(scene, config);
      
      // 创建动画混合器
      const mixer = new THREE.AnimationMixer(scene);
      
      // 计算边界框
      const boundingBox = new THREE.Box3().setFromObject(scene);
      
      // 优化模型
      this.optimizeModel(scene);

      const loadedModel: LoadedHandModel = {
        scene,
        bones,
        mixer,
        gltf,
        boundingBox,
      };

      // 缓存模型
      this.modelCache.set(cacheKey, loadedModel);
      logDebug('模型加载成功并已缓存');

      return loadedModel;
    } catch (error) {
      const err = error as Error;
      logDebug('加载手部模型失败', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      
      // 提供更详细的错误信息
      let detailedError = `无法加载手部模型: ${err.message}`;
      if (err.message.includes('Failed to fetch')) {
        detailedError += '\n可能原因: 模型文件不存在或服务器未启动静态文件服务';
      } else if (err.message.includes('<!DOCTYPE')) {
        detailedError += '\n可能原因: API端点返回了404 HTML页面，请检查模型文件路径是否正确';
        detailedError += `\n当前尝试加载路径: ${config.modelUrl}`;
      }
      
      throw new Error(detailedError);
    }
  }

  /**
   * 加载GLTF文件
   * @param url - 模型URL
   * @returns Promise<any>
   */
  private loadGLTF(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      logDebug('GLTFLoader.load() 被调用', { url });
      this.loader.load(
        url,
        (gltf) => {
          logDebug('GLTFLoader 加载成功');
          resolve(gltf);
        },
        (progress) => {
          const percent = progress.total ? (progress.loaded / progress.total) * 100 : 0;
          if (percent > 0) {
            logDebug(`模型加载进度: ${percent.toFixed(2)}%`, {
              loaded: progress.loaded,
              total: progress.total
            });
          }
        },
        (error) => {
          logDebug('GLTFLoader 加载失败', error);
          reject(error);
        }
      );
    });
  }

  /**
   * 提取骨骼引用
   * @param scene - 场景对象
   * @returns Map<string, THREE.Bone>
   */
  private extractBones(scene: THREE.Group): Map<string, THREE.Bone> {
    const bones = new Map<string, THREE.Bone>();

    scene.traverse((object) => {
      if (object instanceof THREE.Bone) {
        bones.set(object.name, object);
      }
    });

    // 如果没有找到骨骼，尝试从skeleton中获取
    if (bones.size === 0) {
      scene.traverse((object) => {
        if (object instanceof THREE.SkinnedMesh && object.skeleton) {
          object.skeleton.bones.forEach((bone) => {
            bones.set(bone.name, bone);
          });
        }
      });
    }

    return bones;
  }

  /**
   * 配置材质
   * @param scene - 场景对象
   * @param config - 模型配置
   */
  private configureMaterials(scene: THREE.Group, config: HandModelConfig): void {
    const finalConfig = { ...this.defaultConfig, ...config };

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // 克隆材质以避免共享
        const material = object.material.clone();
        
        // 配置PBR材质属性
        if (material instanceof THREE.MeshStandardMaterial) {
          material.roughness = finalConfig.roughness!;
          material.metalness = finalConfig.metalness!;
          
          // 设置基础颜色
          if (finalConfig.skinColor) {
            material.color.set(finalConfig.skinColor);
          }
          if (finalConfig.color) {
            material.color.set(finalConfig.color);
          }
        }

        // 启用阴影
        if (finalConfig.shadows) {
          object.castShadow = true;
          object.receiveShadow = true;
        }

        object.material = material;
      }
    });
  }

  /**
   * 优化模型性能
   * @param scene - 场景对象
   */
  private optimizeModel(scene: THREE.Group): void {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // 压缩几何体
        if (object.geometry) {
          object.geometry.computeBoundingSphere();
          object.geometry.computeBoundingBox();
          
          // 优化属性索引
          if (!object.geometry.index) {
            object.geometry = object.geometry.toNonIndexed();
          }
        }

        // 移除不必要的材质属性
        if (object.material instanceof THREE.Material) {
          object.material.needsUpdate = true;
        }
      }
    });

    // 调整模型缩放和位置
    scene.scale.set(1, 1, 1);
    scene.position.set(0, 0, 0);
    scene.rotation.set(0, 0, 0);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.modelCache.forEach((model) => {
      // 释放资源
      model.mixer.stopAllAction();
      model.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((m) => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    });
    this.modelCache.clear();
  }

  /**
   * 获取缓存的模型
   * @param modelUrl - 模型URL
   */
  getCachedModel(modelUrl: string): LoadedHandModel | undefined {
    return this.modelCache.get(modelUrl);
  }

  /**
   * 预加载模型
   * @param configs - 模型配置数组
   */
  async preloadModels(configs: HandModelConfig[]): Promise<void> {
    await Promise.all(configs.map(config => this.loadModel(config)));
  }

  /**
   * 创建手势关键帧动画
   * @param bones - 骨骼映射
   * @param keyframes - 关键帧数据
   * @returns THREE.AnimationClip
   */
  createAnimationClip(
    bones: Map<string, THREE.Bone>,
    keyframes: { [boneName: string]: THREE.VectorKeyframeTrack[] }
  ): THREE.AnimationClip {
    const tracks: THREE.KeyframeTrack[] = [];

    Object.entries(keyframes).forEach(([boneName, boneKeyframes]) => {
      const bone = bones.get(boneName);
      if (bone) {
        tracks.push(...boneKeyframes);
      }
    });

    return new THREE.AnimationClip('gesture', tracks.length, tracks);
  }

  /**
   * 设置骨骼姿态
   * @param bones - 骨骼映射
   * @param pose - 姿态数据
   */
  setBonePose(
    bones: Map<string, THREE.Bone>,
    pose: { [boneName: string]: { position?: THREE.Vector3; rotation?: THREE.Quaternion; scale?: THREE.Vector3 } }
  ): void {
    Object.entries(pose).forEach(([boneName, transform]) => {
      const bone = bones.get(boneName);
      if (bone) {
        if (transform.position) {
          bone.position.copy(transform.position);
        }
        if (transform.rotation) {
          bone.quaternion.copy(transform.rotation);
        }
        if (transform.scale) {
          bone.scale.copy(transform.scale);
        }
        bone.updateMatrix();
      }
    });
  }

  /**
   * 重置骨骼到默认姿态
   * @param bones - 骨骼映射
   */
  resetBones(bones: Map<string, THREE.Bone>): void {
    bones.forEach((bone) => {
      bone.position.set(0, 0, 0);
      bone.quaternion.set(0, 0, 0, 1);
      bone.scale.set(1, 1, 1);
      bone.updateMatrix();
    });
  }
}

// 导出单例实例
export const handModelLoader = new HandModelLoader();

/**
 * 默认手部模型配置
 */
export const DEFAULT_HAND_MODEL_CONFIG: HandModelConfig = {
  modelUrl: '/models/hand.glb',
  color: '#e8b89d',
  skinColor: '#f5deb3',
  shadows: true,
  roughness: 0.7,
  metalness: 0.1,
  dracoPath: '/draco/',
};

/**
 * 手指骨骼名称映射
 */
export const FINGER_BONES = {
  thumb: ['thumb_01', 'thumb_02', 'thumb_03'],
  index: ['index_01', 'index_02', 'index_03'],
  middle: ['middle_01', 'middle_02', 'middle_03'],
  ring: ['ring_01', 'ring_02', 'ring_03'],
  little: ['little_01', 'little_02', 'little_03'],
};

/**
 * 手掌骨骼名称
 */
export const PALM_BONES = ['palm', 'wrist'];