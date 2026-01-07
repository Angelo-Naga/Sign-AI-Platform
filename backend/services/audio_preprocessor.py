"""
音频预处理工具
提供音频重采样、降噪、音量归一化、静音检测等功能
"""

import logging
import numpy as np
import librosa
import noisereduce as nr
from pydub import AudioSegment
from pydub.silence import detect_nonsilent
import io
from typing import Optional, Tuple, List
from dataclasses import dataclass

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class AudioConfig:
    """音频配置"""
    target_sample_rate: int = 16000  # 目标采样率
    normalize: bool = True  # 是否归一化
    denoise: bool = True  # 是否降噪
    remove_silence: bool = False  # 是否去除静音
    silence_threshold: int = -40  # 静音阈值（dB）
    min_silence_duration: int = 100  # 最小静音时长（毫秒）
    channels: int = 1  # 声道数量（1=单声道，2=立体声）


@dataclass
class AudioSegmentInfo:
    """音频分段信息"""
    audio_data: np.ndarray  # 音频数据
    start_time: float  # 开始时间（秒）
    end_time: float  # 结束时间（秒）
    duration: float  # 时长（秒）


class AudioPreprocessor:
    """音频预处理工具类"""
    
    def __init__(self, config: Optional[AudioConfig] = None):
        """初始化音频预处理器
        
        Args:
            config: 音频配置
        """
        self.config = config or AudioConfig()
        logger.info(f"音频预处理器初始化，配置: {self.config}")
    
    def load_audio(
        self,
        audio_data: bytes,
        input_format: str = "mp3"
    ) -> np.ndarray:
        """加载音频数据
        
        Args:
            audio_data: 音频字节流
            input_format: 输入格式
            
        Returns:
            音频数组（numpy array）
        """
        try:
            # 使用 pydub 加载音频
            audio_segment = AudioSegment.from_file(
                io.BytesIO(audio_data),
                format=input_format
            )
            
            # 转换为单声道
            if self.config.channels == 1 and audio_segment.channels > 1:
                audio_segment = audio_segment.set_channels(1)
            
            # 转换为 numpy array
            samples = np.array(audio_segment.get_array_of_samples())
            
            # 归一化到 [-1, 1]
            if audio_segment.sample_width == 2:  # 16-bit
                samples = samples.astype(np.float32) / 32768.0
            elif audio_segment.sample_width == 4:  # 32-bit
                samples = samples.astype(np.float32) / 2147483648.0
            
            logger.info(f"音频加载成功: 时长={audio_segment.duration_seconds:.2f}s, "
                       f"采样率={audio_segment.frame_rate}Hz")
            
            return samples, audio_segment.frame_rate
            
        except Exception as e:
            logger.error(f"音频加载失败: {str(e)}")
            raise RuntimeError(f"音频加载失败: {str(e)}")
    
    def load_audio_file(
        self,
        file_path: str
    ) -> Tuple[np.ndarray, int]:
        """加载音频文件
        
        Args:
            file_path: 音频文件路径
            
        Returns:
            (音频数据, 采样率)
        """
        try:
            # 使用 librosa 加载
            audio_data, sr = librosa.load(
                file_path,
                sr=None,  # 保持原采样率
                mono=(self.config.channels == 1)
            )
            
            logger.info(f"音频文件加载成功: {file_path}, 采样率={sr}Hz")
            
            return audio_data, sr
            
        except Exception as e:
            logger.error(f"音频文件加载失败: {str(e)}")
            raise RuntimeError(f"音频文件加载失败: {str(e)}")
    
    def resample(
        self,
        audio_data: np.ndarray,
        original_sr: int,
        target_sr: Optional[int] = None
    ) -> np.ndarray:
        """音频重采样
        
        Args:
            audio_data: 输入音频数据
            original_sr: 原始采样率
            target_sr: 目标采样率，None 表示使用配置中的值
            
        Returns:
            重采样后的音频
        """
        try:
            target_sr = target_sr or self.config.target_sample_rate
            
            if original_sr == target_sr:
                logger.info(f"采样率无需调整: {target_sr}Hz")
                return audio_data
            
            # 使用 librosa 重采样
            resampled_audio = librosa.resample(
                audio_data,
                orig_sr=original_sr,
                target_sr=target_sr
            )
            
            logger.info(f"重采样完成: {original_sr}Hz -> {target_sr}Hz")
            
            return resampled_audio
            
        except Exception as e:
            logger.error(f"重采样失败: {str(e)}")
            raise RuntimeError(f"重采样失败: {str(e)}")
    
    def denoise(
        self,
        audio_data: np.ndarray,
        sample_rate: int,
        stationary: bool = False
    ) -> np.ndarray:
        """音频降噪
        
        Args:
            audio_data: 输入音频数据
            sample_rate: 采样率
            stationary: 是否使用静态噪声模型
            
        Returns:
            降噪后的音频
        """
        try:
            if not self.config.denoise:
                return audio_data
            
            # 使用 noisereduce 降噪
            denoised_audio = nr.reduce_noise(
                y=audio_data,
                sr=sample_rate,
                stationary=stationary,
                prop_decrease=0.8  # 降噪强度（0-1）
            )
            
            logger.info("音频降噪完成")
            
            return denoised_audio
            
        except Exception as e:
            logger.error(f"降噪失败: {str(e)}")
            return audio_data  # 降级返回原始音频
    
    def normalize(
        self,
        audio_data: np.ndarray,
        target_db: float = -3.0
    ) -> np.ndarray:
        """音量归一化
        
        Args:
            audio_data: 输入音频数据
            target_db: 目标音量（dB）
            
        Returns:
            归一化后的音频
        """
        try:
            if not self.config.normalize:
                return audio_data
            
            # 计算当前 RMS
            rms = np.sqrt(np.mean(audio_data ** 2))
            
            if rms == 0:
                return audio_data
            
            # 计算缩放因子
            target_rms = 10 ** (target_db / 20)
            scale_factor = target_rms / rms
            
            # 限制缩放因子，避免过度放大
            scale_factor = min(scale_factor, 3.0)
            
            normalized_audio = audio_data * scale_factor
            
            # 限幅防止削波
            normalized_audio = np.clip(normalized_audio, -1.0, 1.0)
            
            logger.info(f"音量归一化完成: 原始RMS={rms:.4f}, 目标RMS={target_rms:.4f}")
            
            return normalized_audio
            
        except Exception as e:
            logger.error(f"归一化失败: {str(e)}")
            return audio_data
    
    def detect_silence(
        self,
        audio_data: np.ndarray,
        sample_rate: int
    ) -> List[Tuple[float, float]]:
        """检测静音片段
        
        Args:
            audio_data: 音频数据
            sample_rate: 采样率
            
        Returns:
            静音片段列表 [(开始时间, 结束时间), ...]
        """
        try:
            # 将 numpy array 转换为 AudioSegment
            audio_segment = AudioSegment(
                audio_data.tobytes(),
                frame_rate=sample_rate,
                sample_width=audio_data.dtype.itemsize,
                channels=1
            )
            
            # 检测非静音片段
            nonsilent_ranges = detect_nonsilent(
                audio_segment,
                min_silence_len=self.config.min_silence_duration,
                silence_thresh=self.config.silence_threshold,
                seek_step=10
            )
            
            # 转换为静音片段
            silence_ranges = []
            prev_end = 0
            
            for start, end in nonsilent_ranges:
                if start > prev_end:
                    silence_ranges.append((prev_end / 1000.0, start / 1000.0))
                prev_end = end
            
            # 检查末尾静音
            total_duration = len(audio_segment) / 1000.0
            if prev_end < total_duration:
                silence_ranges.append((prev_end / 1000.0, total_duration))
            
            total_silence = sum(end - start for start, end in silence_ranges)
            logger.info(f"静音检测完成: {len(silence_ranges)} 个静音片段, "
                       f"总时长: {total_silence:.2f}s")
            
            return silence_ranges
            
        except Exception as e:
            logger.error(f"静音检测失败: {str(e)}")
            return []
    
    def remove_silence(
        self,
        audio_data: np.ndarray,
        sample_rate: int
    ) -> np.ndarray:
        """去除静音片段
        
        Args:
            audio_data: 音频数据
            sample_rate: 采样率
            
        Returns:
            去除静音后的音频
        """
        try:
            if not self.config.remove_silence:
                return audio_data
            
            # 将 numpy array 转换为 AudioSegment
            audio_segment = AudioSegment(
                audio_data.tobytes(),
                frame_rate=sample_rate,
                sample_width=audio_data.dtype.itemsize,
                channels=1
            )
            
            # 检测非静音片段
            nonsilent_ranges = detect_nonsilent(
                audio_segment,
                min_silence_len=self.config.min_silence_duration,
                silence_thresh=self.config.silence_threshold,
                seek_step=10
            )
            
            if not nonsilent_ranges:
                logger.warning("未检测到有效音频")
                return audio_data
            
            # 提取非静音片段
            audio_segments = []
            for start, end in nonsilent_ranges:
                segment = audio_segment[start:end]
                audio_segments.append(segment)
            
            # 拼接音频
            if audio_segments:
                result_segment = audio_segments[0]
                for segment in audio_segments[1:]:
                    # 添加 50ms 的过渡
                    result_segment = result_segment + AudioSegment.silent(duration=50)
                    result_segment = result_segment + segment
                
                # 转换回 numpy array
                samples = np.array(result_segment.get_array_of_samples())
                samples = samples.astype(np.float32) / 32768.0
                
                original_length = len(audio_data)
                new_length = len(samples)
                logger.info(f"静音去除完成: 原始={original_length/sample_rate:.2f}s, "
                           f"处理后={new_length/sample_rate:.2f}s")
                
                return samples
            
            return audio_data
            
        except Exception as e:
            logger.error(f"静音去除失败: {str(e)}")
            return audio_data
    
    def frame_audio(
        self,
        audio_data: np.ndarray,
        frame_length: float = 0.025,
        hop_length: float = 0.010,
        sample_rate: Optional[int] = None
    ) -> List[AudioSegmentInfo]:
        """音频分帧处理
        
        Args:
            audio_data: 音频数据
            frame_length: 帧长度（秒）
            hop_length: 帧移（秒）
            sample_rate: 采样率
            
        Returns:
            音频分段列表
        """
        try:
            sr = sample_rate or self.config.target_sample_rate
            frame_samples = int(frame_length * sr)
            hop_samples = int(hop_length * sr)
            
            segments = []
            total_samples = len(audio_data)
            
            for i in range(0, total_samples - frame_samples + 1, hop_samples):
                start_sample = i
                end_sample = i + frame_samples
                
                segment_audio = audio_data[start_sample:end_sample]
                
                segments.append(AudioSegmentInfo(
                    audio_data=segment_audio,
                    start_time=start_sample / sr,
                    end_time=end_sample / sr,
                    duration=frame_length
                ))
            
            # 处理剩余样本（最后一段）
            if total_samples > frame_samples:
                start_sample = total_samples - frame_samples
                segment_audio = audio_data[start_sample:]
                
                if len(audio_data[start_sample:]) < frame_samples:
                    # 填充
                    padding = np.zeros(frame_samples - len(segment_audio))
                    segment_audio = np.concatenate([segment_audio, padding])
                
                segments.append(AudioSegmentInfo(
                    audio_data=segment_audio,
                    start_time=start_sample / sr,
                    end_time=total_samples / sr,
                    duration=frame_length
                ))
            
            logger.info(f"音频分帧完成: {len(segments)} 帧")
            
            return segments
            
        except Exception as e:
            logger.error(f"音频分帧失败: {str(e)}")
            raise RuntimeError(f"音频分帧失败: {str(e)}")
    
    def process(
        self,
        audio_data: bytes,
        input_format: str = "mp3"
    ) -> Tuple[np.ndarray, int]:
        """完整的音频预处理流程
        
        Args:
            audio_data: 音频字节流
            input_format: 输入格式
            
        Returns:
            (处理后的音频, 采样率)
        """
        try:
            # 1. 加载音频
            audio, sr = self.load_audio(audio_data, input_format)
            
            # 2. 重采样
            audio = self.resample(audio, sr)
            sr = self.config.target_sample_rate
            
            # 3. 降噪
            audio = self.denoise(audio, sr)
            
            # 4. 归一化
            audio = self.normalize(audio)
            
            # 5. 去除静音
            if self.config.remove_silence:
                audio = self.remove_silence(audio, sr)
            
            logger.info("音频预处理流程完成")
            
            return audio, sr
            
        except Exception as e:
            logger.error(f"音频预处理失败: {str(e)}")
            raise RuntimeError(f"音频预处理失败: {str(e)}")
    
    def save_audio(
        self,
        audio_data: np.ndarray,
        sample_rate: int,
        output_path: str,
        output_format: str = "wav"
    ) -> None:
        """保存音频到文件
        
        Args:
            audio_data: 音频数据
            sample_rate: 采样率
            output_path: 输出文件路径
            output_format: 输出格式
        """
        try:
            # 将 float32 转换为 int16
            audio_int16 = (audio_data * 32767).astype(np.int16)
            
            # 使用 soundfile 保存
            import soundfile as sf
            sf.write(output_path, audio_int16, sample_rate, format=output_format)
            
            logger.info(f"音频已保存: {output_path}")
            
        except Exception as e:
            logger.error(f"保存音频失败: {str(e)}")
            raise RuntimeError(f"保存音频失败: {str(e)}")


# 全局单例
_audio_preprocessor: Optional[AudioPreprocessor] = None


def get_audio_preprocessor(
    config: Optional[AudioConfig] = None
) -> AudioPreprocessor:
    """获取音频预处理器单例
    
    Args:
        config: 音频配置
        
    Returns:
        AudioPreprocessor 实例
    """
    global _audio_preprocessor
    
    if _audio_preprocessor is None:
        _audio_preprocessor = AudioPreprocessor(config)
    
    return _audio_preprocessor