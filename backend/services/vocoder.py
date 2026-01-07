"""
声码器模块
基于预训练模型的声码器接口，支持 HiFi-GAN 和 WaveGlow
实现梅尔频谱到音频波形的转换
"""

import logging
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Optional, Tuple, List
from dataclasses import dataclass
from pathlib import Path
import scipy.signal as signal
import soundfile as sf

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class VocoderConfig:
    """声码器配置"""
    # 音频参数
    sample_rate: int = 22050  # 采样率
    n_fft: int = 1024  # FFT 窗口大小
    hop_length: int = 256  # 跳跃长度
    win_length: int = 1024  # 窗口长度
    n_mels: int = 80  # 梅尔频谱数量
    
    # 模型参数
    model_type: str = "hifigan"  # 模型类型 (hifigan, waveglow, griffinlim)
    
    # Griffin-Lim 参数
    n_iter: int = 32  # Griffin-Lim 迭代次数
    
    # HiFi-GAN 参数
    upsample_rates: Tuple[int, ...] = (8, 8, 2, 2)
    upsample_kernel_sizes: Tuple[int, ...] = (16, 16, 4, 4)
    resblock_kernel_sizes: Tuple[int, ...] = (3, 7, 11)
    resblock_dilation_sizes: Tuple[Tuple[int, ...], ...] = ((1, 3, 5), (1, 3, 5), (1, 3, 5))


class ResidualBlock(nn.Module):
    """残差块（用于 HiFi-GAN）"""
    
    def __init__(self, kernel_size: int, channels: int, dilation: int = 1):
        """初始化残差块
        
        Args:
            kernel_size: 卷积核大小
            channels: 通道数
            dilation: 膨胀率
        """
        super(ResidualBlock, self).__init__()
        
        padding = (kernel_size - 1) // 2 * dilation
        
        self.convs = nn.ModuleList([
            nn.Sequential(
                nn.Conv1d(channels, channels, kernel_size, padding=padding, dilation=dilation),
                nn.LeakyReLU(0.2)
            ),
            nn.Sequential(
                nn.Conv1d(channels, channels, kernel_size, padding=padding, dilation=1),
                nn.LeakyReLU(0.2)
            )
        ])
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """前向传播
        
        Args:
            x: 输入张量
            
        Returns:
            输出张量
        """
        for conv in self.convs:
            x = x + conv(x)
        return x


class HiFiGANGenerator(nn.Module):
    """HiFi-GAN 生成器"""
    
    def __init__(self, config: VocoderConfig):
        """初始化 HiFi-GAN 生成器
        
        Args:
            config: 声码器配置
        """
        super(HiFiGANGenerator, self).__init__()
        self.config = config
        
        # 计算总的通道数
        channels = config.n_mels
        
        # 初始卷积层
        self.conv_pre = nn.Conv1d(channels, 512, 7, 1, padding=3)
        
        # 上采样层
        self.upsample = nn.ModuleList()
        for rate, kernel_size in zip(
            config.upsample_rates,
            config.upsample_kernel_sizes
        ):
            self.upsample.append(
                nn.Sequential(
                    nn.ConvTranspose1d(
                        512 // 2 ** len(self.upsample),
                        512 // 2 ** (len(self.upsample) + 1),
                        kernel_size,
                        stride=rate,
                        padding=(kernel_size - rate) // 2
                    ),
                    nn.LeakyReLU(0.2)
                )
            )
        
        # 残差块
        self.resblocks = nn.ModuleList()
        for i in range(len(config.upsample_rates)):
            channels = 512 // 2 ** (i + 1)
            for kernel_size in config.resblock_kernel_sizes:
                for dilation in config.resblock_dilation_sizes[0]:
                    self.resblocks.append(
                        ResidualBlock(kernel_size, channels, dilation)
                    )
        
        # 后处理卷积层
        self.conv_post = nn.Sequential(
            nn.Conv1d(32, 1, 7, 1, padding=3),
            nn.Tanh()
        )
        
        logger.info("HiFi-GAN 生成器初始化完成")
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """前向传播
        
        Args:
            x: 梅尔频谱 (batch, n_mels, time)
            
        Returns:
            音频波形 (batch, 1, time)
        """
        # 初始卷积
        x = self.conv_pre(x)
        
        # 上采样和残差处理
        for i, upsample in enumerate(self.upsample):
            x = F.leaky_relu(x, 0.2)
            x = upsample(x)
            
            # 应用对应的残差块
            for j in range(3 * 3):  # 3 kernel sizes * 3 dilations
                idx = i * 9 + j
                if idx < len(self.resblocks):
                    x = x + self.resblocks[idx](x)
        
        # 后处理
        x = self.conv_post(x)
        
        return x


class WaveglowModel(nn.Module):
    """WaveGlow 模型（简化版）"""
    
    def __init__(self, config: VocoderConfig):
        """初始化 WaveGlow 模型
        
        Args:
            config: 声码器配置
        """
        super(WaveglowModel, self).__init__()
        self.config = config
        
        # 简化的 WaveFlow 架构
        self.channels = config.n_mels
        
        # WaveNet 风格的残差块
        self.dilated_convs = nn.ModuleList()
        for i in range(8):
            dilation = 2 ** (i % 4)
            self.dilated_convs.append(
                nn.Sequential(
                    nn.Conv1d(
                        config.n_mels * 2,
                        config.n_mels * 2,
                        kernel_size=3,
                        padding=dilation,
                        dilation=dilation
                    ),
                    nn.Tanh()
                )
            )
        
        # 输出卷积
        self.output_conv = nn.Conv1d(
            config.n_mels * 2,
            2,
            kernel_size=1
        )
        
        logger.info("WaveGlow 模型初始化完成")
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """前向传播
        
        Args:
            x: 梅尔频谱 (batch, n_mels, time)
            
        Returns:
            音频波形 (batch, time)
        """
        # 重复输入以增加通道
        x = torch.cat([x, x], dim=1)
        
        # 残差处理
        skip_connections = []
        for conv in self.dilated_convs:
            x = conv(x)
            skip_connections.append(x)
        
        # 合并跳跃连接
        x = sum(skip_connections)
        
        # 输出
        x = self.output_conv(x)
        
        # 取第一个通道作为音频
        audio = x[:, 0, :]
        
        return audio


class GriffinLimVocoder:
    """Griffin-Lim 声码器（经典算法）"""
    
    def __init__(self, config: VocoderConfig):
        """初始化 Griffin-Lim 声码器
        
        Args:
            config: 声码器配置
        """
        self.config = config
        logger.info("Griffin-Lim 声码器初始化完成")
    
    def infer(self, mel_spec: np.ndarray) -> np.ndarray:
        """使用 Griffin-Lim 算法从梅尔频谱重建音频
        
        Args:
            mel_spec: 梅尔频谱 (n_mels, time)
            
        Returns:
            音频波形
        """
        try:
            # 将梅尔频谱转换为线性频谱
            linear_spec = self._mel_to_linear(mel_spec)
            
            # 构造幅度谱
            magnitude = np.exp(linear_spec)
            
            # Griffin-Lim 算法
            audio = self._griffin_lim(magnitude)
            
            logger.info(f"Griffin-Lim 推理完成，音频长度: {len(audio)}")
            
            return audio
            
        except Exception as e:
            logger.error(f"Griffin-Lim 推理失败: {str(e)}")
            raise RuntimeError(f"Griffin-Lim 推理失败: {str(e)}")
    
    def _mel_to_linear(self, mel_spec: np.ndarray) -> np.ndarray:
        """将梅尔频谱转换为线性频谱"""
        # 简化的逆变换
        return mel_spec * 10  # 简化的缩放
    
    def _griffin_lim(self, magnitude: np.ndarray) -> np.ndarray:
        """Griffin-Lim 算法
        
        Args:
            magnitude: 幅度谱
            
        Returns:
            音频波形
        """
        # 初始化相位
        phase = np.exp(1j * np.random.uniform(0, 2 * np.pi, magnitude.shape))
        
        # 迭代
        for _ in range(self.config.n_iter):
            # 重建频谱
            spec = magnitude * phase
            
            # ISTFT
            audio = self._istft(spec)
            
            # STFT
            spec_new = self._stft(audio)
            
            # 更新相位
            phase = spec_new / (np.abs(spec_new) + 1e-8)
        
        return audio
    
    def _stft(self, audio: np.ndarray) -> np.ndarray:
        """短时傅里叶变换"""
        _, _, spec = signal.stft(
            audio,
            fs=self.config.sample_rate,
            nperseg=self.config.win_length,
            noverlap=self.config.win_length - self.config.hop_length,
            nfft=self.config.n_fft
        )
        return spec
    
    def _istft(self, spec: np.ndarray) -> np.ndarray:
        """逆短时傅里叶变换"""
        _, audio = signal.istft(
            spec,
            fs=self.config.sample_rate,
            nperseg=self.config.win_length,
            noverlap=self.config.win_length - self.config.hop_length,
            nfft=self.config.n_fft
        )
        return audio


class Vocoder:
    """声码器主类"""
    
    def __init__(self, config: Optional[VocoderConfig] = None):
        """初始化声码器
        
        Args:
            config: 声码器配置
        """
        self.config = config or VocoderConfig()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # 根据模型类型初始化
        if self.config.model_type == "hifigan":
            self.model = HiFiGANGenerator(self.config).to(self.device)
        elif self.config.model_type == "waveglow":
            self.model = WaveglowModel(self.config).to(self.device)
        elif self.config.model_type == "griffinlim":
            self.model = GriffinLimVocoder(self.config)
        else:
            raise ValueError(f"不支持的模型类型: {self.config.model_type}")
        
        logger.info(f"声码器初始化完成，模型类型: {self.config.model_type}, 设备: {self.device}")
    
    def load_model(self, model_path: str):
        """加载预训练模型
        
        Args:
            model_path: 模型文件路径
        """
        try:
            if self.config.model_type == "griffinlim":
                logger.info("Griffin-Lim 不需要加载预训练模型")
                return
            
            if Path(model_path).exists():
                checkpoint = torch.load(
                    model_path,
                    map_location=self.device
                )
                self.model.load_state_dict(checkpoint['model_state_dict'])
                logger.info(f"成功加载模型: {model_path}")
            else:
                logger.warning(f"模型文件不存在: {model_path}，使用随机初始化的模型")
        except Exception as e:
            logger.error(f"加载模型失败: {str(e)}")
            raise RuntimeError(f"加载模型失败: {str(e)}")
    
    def save_model(self, model_path: str):
        """保存模型
        
        Args:
            model_path: 模型保存路径
        """
        try:
            if self.config.model_type == "griffinlim":
                logger.info("Griffin-Lim 不需要保存模型")
                return
            
            # 创建目录
            Path(model_path).parent.mkdir(parents=True, exist_ok=True)
            
            # 保存模型
            torch.save({
                'model_state_dict': self.model.state_dict(),
                'config': self.config
            }, model_path)
            
            logger.info(f"模型保存成功: {model_path}")
            
        except Exception as e:
            logger.error(f"保存模型失败: {str(e)}")
            raise RuntimeError(f"保存模型失败: {str(e)}")
    
    def infer(self, mel_spec: np.ndarray) -> np.ndarray:
        """从梅尔频谱生成音频波形
        
        Args:
            mel_spec: 梅尔频谱 (n_mels, time)
            
        Returns:
            音频波形
        """
        try:
            if self.config.model_type == "griffinlim":
                # 使用 Griffin-Lim
                audio = self.model.infer(mel_spec)
            else:
                # 使用神经网络模型
                # 转换为张量
                mel_tensor = torch.from_numpy(mel_spec).float().unsqueeze(0).to(self.device)
                
                # 推理
                with torch.no_grad():
                    if self.config.model_type == "hifigan":
                        audio_tensor = self.model(mel_tensor)
                        audio = audio_tensor.squeeze(0).squeeze(0).cpu().numpy()
                    else:  # waveglow
                        audio_tensor = self.model(mel_tensor)
                        audio = audio_tensor.squeeze(0).cpu().numpy()
            
            # 归一化
            audio = self._normalize_audio(audio)
            
            logger.info(f"声码器推理完成，音频长度: {len(audio)}, 采样率: {self.config.sample_rate}")
            
            return audio
            
        except Exception as e:
            logger.error(f"声码器推理失败: {str(e)}")
            raise RuntimeError(f"声码器推理失败: {str(e)}")
    
    def _normalize_audio(self, audio: np.ndarray) -> np.ndarray:
        """归一化音频
        
        Args:
            audio: 输入音频
            
        Returns:
            归一化后的音频
        """
        # 限制幅度
        max_val = np.max(np.abs(audio))
        if max_val > 0:
            audio = audio / max_val * 0.95
        
        # 限幅
        audio = np.clip(audio, -1.0, 1.0)
        
        return audio
    
    def infer_batch(self, mel_specs: List[np.ndarray]) -> List[np.ndarray]:
        """批量推理
        
        Args:
            mel_specs: 梅尔频谱列表
            
        Returns:
            音频波形列表
        """
        try:
            audio_outputs = []
            
            for mel_spec in mel_specs:
                audio = self.infer(mel_spec)
                audio_outputs.append(audio)
            
            logger.info(f"批量推理 {len(audio_outputs)} 个音频完成")
            
            return audio_outputs
            
        except Exception as e:
            logger.error(f"批量推理失败: {str(e)}")
            raise RuntimeError(f"批量推理失败: {str(e)}")
    
    def save_audio(
        self,
        audio: np.ndarray,
        file_path: str,
        sample_rate: Optional[int] = None
    ):
        """保存音频到文件
        
        Args:
            audio: 音频波形
            file_path: 保存路径
            sample_rate: 采样率，None 表示使用配置中的值
        """
        try:
            sr = sample_rate or self.config.sample_rate
            
            # 创建目录
            Path(file_path).parent.mkdir(parents=True, exist_ok=True)
            
            # 保存音频
            sf.write(file_path, audio, sr)
            
            logger.info(f"音频保存成功: {file_path}")
            
        except Exception as e:
            logger.error(f"保存音频失败: {str(e)}")
            raise RuntimeError(f"保存音频失败: {str(e)}")
    
    def compute_audio_quality_metrics(
        self,
        audio: np.ndarray
    ) -> dict:
        """计算音频质量指标
        
        Args:
            audio: 音频波形
            
        Returns:
            质量指标字典
        """
        try:
            metrics = {}
            
            # 信噪比（简化计算）
            signal_power = np.mean(audio ** 2)
            noise_floor = np.var(audio) * 0.01
            snr = 10 * np.log10((signal_power + 1e-8) / (noise_floor + 1e-8))
            metrics['snr_db'] = float(snr)
            
            # 峰值幅度
            peak_amplitude = float(np.max(np.abs(audio)))
            metrics['peak_amplitude'] = peak_amplitude
            
            # RMS 幅度
            rms_amplitude = float(np.sqrt(np.mean(audio ** 2)))
            metrics['rms_amplitude'] = rms_amplitude
            
            # 零交叉率
            zero_crossings = np.sum(np.abs(np.diff(np.sign(audio)))) / 2
            zero_crossing_rate = zero_crossings / len(audio)
            metrics['zero_crossing_rate'] = float(zero_crossing_rate)
            
            logger.debug(f"音频质量指标: {metrics}")
            
            return metrics
            
        except Exception as e:
            logger.error(f"计算音频质量指标失败: {str(e)}")
            return {}