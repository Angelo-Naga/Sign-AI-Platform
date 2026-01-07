"""
模型加载器模块
管理ST-GCN模型的下载、缓存和加载
"""

import os
import json
import requests
import hashlib
import torch
from typing import Optional, Dict, Any
from pathlib import Path
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ModelLoader:
    """模型加载器类"""
    
    # 默认配置
    DEFAULT_CACHE_DIR = "models/cache"
    DEFAULT_MODEL_URL = "https://huggingface.co/models/st-gcn"
    DEFAULT_TIMEOUT = 300  # 下载超时时间（秒）
    
    def __init__(self, cache_dir: Optional[str] = None, device: Optional[str] = None):
        """
        初始化模型加载器
        
        Parameters:
        -----------
        cache_dir: str, optional
            模型缓存目录
        device: str, optional
            设备类型 ('cuda' 或 'cpu')
        """
        if cache_dir is None:
            self.cache_dir = self.DEFAULT_CACHE_DIR
        else:
            self.cache_dir = cache_dir
        
        # 创建缓存目录
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # 设备选择
        if device is None:
            self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        else:
            self.device = device
        
        logger.info(f"模型加载器初始化完成，缓存目录: {self.cache_dir}, 设备: {self.device}")
    
    def check_model_exists(self, model_name: str) -> bool:
        """
        检查模型文件是否存在
        
        Parameters:
        -----------
        model_name: str
            模型名称
            
        Returns:
        --------
        bool
            模型是否存在
        """
        try:
            model_path = os.path.join(self.cache_dir, f"{model_name}.pth")
            exists = os.path.exists(model_path)
            
            logger.debug(f"检查模型 {model_name}: {'存在' if exists else '不存在'}")
            return exists
            
        except Exception as e:
            logger.error(f"检查模型存在性失败: {str(e)}")
            return False
    
    def download_model(
        self,
        url: str,
        model_name: str,
        verify_checksum: bool = True
    ) -> bool:
        """
        从URL下载模型
        
        Parameters:
        -----------
        url: str
            模型下载URL
        model_name: str
            模型名称（用于缓存文件名）
        verify_checksum: bool
            是否验证校验和
            
        Returns:
        --------
        bool
            是否下载成功
        """
        try:
            model_path = os.path.join(self.cache_dir, f"{model_name}.pth")
            
            # 如果模型已存在，询问是否覆盖
            if os.path.exists(model_path):
                logger.warning(f"模型已存在: {model_path}，跳过下载")
                return True
            
            logger.info(f"开始下载模型: {url}")
            
            # 下载模型
            response = requests.get(
                url, 
                stream=True, 
                timeout=self.DEFAULT_TIMEOUT
            )
            response.raise_for_status()
            
            # 保存模型
            total_size = int(response.headers.get('content-length', 0))
            downloaded_size = 0
            
            with open(model_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded_size += len(chunk)
                        
                        # 显示下载进度
                        if total_size > 0:
                            progress = (downloaded_size / total_size) * 100
                            if downloaded_size % (1024 * 1024) == 0:  # 每MB输出一次
                                logger.debug(f"下载进度: {progress:.1f}%")
            
            logger.info(f"模型下载成功: {model_path}")
            
            # 验证校验和
            if verify_checksum:
                # 这里可以添加校验和验证逻辑
                # 从URL或元数据获取预期的校验和
                checksum_path = os.path.join(self.cache_dir, f"{model_name}.checksum")
                if os.path.exists(checksum_path):
                    self._verify_checksum(model_path, checksum_path)
            
            return True
            
        except requests.RequestException as e:
            logger.error(f"下载模型失败: {str(e)}")
            # 删除下载不完整的文件
            if os.path.exists(model_path):
                os.remove(model_path)
            return False
        except Exception as e:
            logger.error(f"下载模型时发生错误: {str(e)}")
            return False
    
    def load_stgcn_model(
        self,
        model_path: Optional[str] = None,
        num_classes: int = 31
    ):
        """
        加载ST-GCN模型
        
        Parameters:
        -----------
        model_path: str, optional
            模型文件路径，如果为None则创建新模型
        num_classes: int
            模型输出类别数
            
        Returns:
        --------
        STGCN
            加载的模型实例
        """
        try:
            from services.stgcn_model import create_stgcn_model
            
            if model_path is not None and os.path.exists(model_path):
                logger.info(f"从文件加载模型: {model_path}")
                model = create_stgcn_model(
                    num_classes=num_classes,
                    pretrained_path=model_path,
                    device=self.device
                )
            else:
                if model_path is None:
                    logger.info("创建新的ST-GCN模型（随机初始化）")
                else:
                    logger.warning(f"模型文件不存在: {model_path}，创建新模型")
                
                model = create_stgcn_model(
                    num_classes=num_classes,
                    device=self.device
                )
            
            logger.info("ST-GCN模型加载成功")
            return model
            
        except Exception as e:
            logger.error(f"加载ST-GCN模型失败: {str(e)}")
            raise
    
    def load_model_from_huggingface(
        self,
        repo_id: str,
        filename: str,
        force_download: bool = False
    ) -> str:
        """
        从Hugging Face下载模型
        
        Parameters:
        -----------
        repo_id: str
            Hugging Face仓库ID（如 "username/model-name"）
        filename: str
            模型文件名
        force_download: bool
            是否强制重新下载
            
        Returns:
        --------
        str
            下载的模型文件路径
        """
        try:
            # 检查是否安装 huggingface_hub
            try:
                from huggingface_hub import hf_hub_download
            except ImportError:
                logger.warning(
                    "未安装 huggingface_hub，尝试使用requests下载。"
                    "建议运行: pip install huggingface_hub"
                )
                # 构造下载URL
                url = f"https://huggingface.co/{repo_id}/resolve/main/{filename}"
                local_path = os.path.join(self.cache_dir, filename)
                
                if force_download or not os.path.exists(local_path):
                    success = self.download_model(url, filename.replace('.pth', ''))
                    if not success:
                        raise RuntimeError("模型下载失败")
                
                return local_path
            
            # 使用 huggingface_hub 下载
            local_path = os.path.join(self.cache_dir, filename)
            
            if force_download or not os.path.exists(local_path):
                logger.info(f"从Hugging Face下载模型: {repo_id}/{filename}")
                
                # 下载到缓存目录
                local_path = hf_hub_download(
                    repo_id=repo_id,
                    filename=filename,
                    cache_dir=self.cache_dir,
                    force_download=force_download
                )
                
                logger.info(f"模型下载成功: {local_path}")
            else:
                logger.info(f"使用缓存的模型: {local_path}")
            
            return local_path
            
        except Exception as e:
            logger.error(f"从Hugging Face加载模型失败: {str(e)}")
            raise
    
    def _verify_checksum(self, filepath: str, checksum_path: str) -> bool:
        """
        验证文件校验和
        
        Parameters:
        -----------
        filepath: str
            要验证的文件路径
        checksum_path: str
            校验和文件路径
            
        Returns:
        --------
        bool
            校验和是否匹配
        """
        try:
            # 读取预期的校验和
            with open(checksum_path, 'r') as f:
                expected_checksum = f.read().strip()
            
            # 计算文件的MD5校验和
            md5_hash = hashlib.md5()
            with open(filepath, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    md5_hash.update(chunk)
            actual_checksum = md5_hash.hexdigest()
            
            if actual_checksum == expected_checksum:
                logger.info("校验和验证通过")
                return True
            else:
                logger.error(
                    f"校验和不匹配！预期: {expected_checksum}, 实际: {actual_checksum}"
                )
                return False
            
        except Exception as e:
            logger.error(f"验证校验和失败: {str(e)}")
            return False
    
    def save_model(
        self,
        model: Any,
        model_name: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        保存模型到缓存目录
        
        Parameters:
        -----------
        model: Any
            要保存的模型（PyTorch模型）
        model_name: str
            模型名称
        metadata: Dict, optional
            模型元数据
            
        Returns:
        --------
        str
            保存的模型文件路径
        """
        try:
            model_path = os.path.join(self.cache_dir, f"{model_name}.pth")
            
            # 保存模型状态字典
            torch.save({
                'model_state_dict': model.state_dict(),
                'metadata': metadata or {}
            }, model_path)
            
            logger.info(f"模型保存成功: {model_path}")
            
            # 保存元数据
            if metadata:
                metadata_path = os.path.join(self.cache_dir, f"{model_name}.json")
                with open(metadata_path, 'w', encoding='utf-8') as f:
                    json.dump(metadata, f, indent=2, ensure_ascii=False)
            
            return model_path
            
        except Exception as e:
            logger.error(f"保存模型失败: {str(e)}")
            raise
    
    def load_model_metadata(self, model_name: str) -> Optional[Dict[str, Any]]:
        """
        加载模型元数据
        
        Parameters:
        -----------
        model_name: str
            模型名称
            
        Returns:
        --------
        Dict or None
            模型元数据
        """
        try:
            metadata_path = os.path.join(self.cache_dir, f"{model_name}.json")
            
            if not os.path.exists(metadata_path):
                logger.warning(f"模型元数据不存在: {metadata_path}")
                return None
            
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            
            return metadata
            
        except Exception as e:
            logger.error(f"加载模型元数据失败: {str(e)}")
            return None
    
    def clear_cache(self, model_name: Optional[str] = None):
        """
        清理缓存
        
        Parameters:
        -----------
        model_name: str, optional
            模型名称，如果为None则清理所有缓存
        """
        try:
            if model_name is None:
                # 清理所有缓存
                for filename in os.listdir(self.cache_dir):
                    filepath = os.path.join(self.cache_dir, filename)
                    if os.path.isfile(filepath):
                        os.remove(filepath)
                logger.info(f"已清理所有缓存: {self.cache_dir}")
            else:
                # 清理指定模型的缓存
                patterns = [f"{model_name}.pth", f"{model_name}.json", f"{model_name}.checksum"]
                for pattern in patterns:
                    filepath = os.path.join(self.cache_dir, pattern)
                    if os.path.exists(filepath):
                        os.remove(filepath)
                        logger.info(f"已删除: {filepath}")
            
        except Exception as e:
            logger.error(f"清理缓存失败: {str(e)}")
    
    def list_cached_models(self) -> Dict[str, Dict[str, Any]]:
        """
        列出缓存的模型
        
        Returns:
        --------
        Dict
            缓存模型列表
        """
        try:
            models = {}
            
            for filename in os.listdir(self.cache_dir):
                if filename.endswith('.pth'):
                    model_name = filename[:-4]  # 移除 .pth 扩展名
                    model_path = os.path.join(self.cache_dir, filename)
                    
                    # 获取文件大小
                    file_size = os.path.getsize(model_path)
                    
                    # 加载元数据
                    metadata = self.load_model_metadata(model_name)
                    
                    models[model_name] = {
                        'path': model_path,
                        'size': file_size,
                        'metadata': metadata
                    }
            
            logger.info(f"找到 {len(models)} 个缓存的模型")
            return models
            
        except Exception as e:
            logger.error(f"列出缓存模型失败: {str(e)}")
            return {}
    
    def get_device_info(self) -> Dict[str, Any]:
        """
        获取设备信息
        
        Returns:
        --------
        Dict
            设备信息
        """
        try:
            info = {
                'device': self.device,
                'torch_version': torch.__version__,
                'cuda_available': torch.cuda.is_available(),
            }
            
            if torch.cuda.is_available():
                info['cuda_version'] = torch.version.cuda
                info['gpu_count'] = torch.cuda.device_count()
                info['gpu_name'] = torch.cuda.get_device_name(0)
                info['gpu_memory_allocated'] = torch.cuda.memory_allocated(0)
                info['gpu_memory_reserved'] = torch.cuda.memory_reserved(0)
            
            return info
            
        except Exception as e:
            logger.error(f"获取设备信息失败: {str(e)}")
            return {'device': 'unknown'}


def create_model_loader(
    cache_dir: Optional[str] = None,
    device: Optional[str] = None
) -> ModelLoader:
    """
    创建模型加载器实例
    
    Parameters:
    -----------
    cache_dir: str, optional
        缓存目录
    device: str, optional
        设备类型
        
    Returns:
    --------
    ModelLoader
        模型加载器实例
    """
    return ModelLoader(cache_dir=cache_dir, device=device)


if __name__ == '__main__':
    # 测试代码
    print("测试模型加载器...")
    
    # 创建模型加载器
    loader = ModelLoader()
    
    # 打印设备信息
    device_info = loader.get_device_info()
    print(f"\n设备信息:")
    for key, value in device_info.items():
        print(f"  {key}: {value}")
    
    # 列出缓存的模型
    cached_models = loader.list_cached_models()
    print(f"\n缓存的模型:")
    for name, info in cached_models.items():
        print(f"  {name}: {info['size']} bytes")
    
    print("\n测试完成！")