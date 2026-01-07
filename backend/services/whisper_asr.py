"""
Whisper ASR 语音识别服务
基于 OpenAI Whisper 模型实现语音识别功能
支持实时流式识别和多语言（中英文）
"""

import logging
import asyncio
from typing import Optional, List, Dict, Any, AsyncGenerator
from pathlib import Path
import numpy as np
import torch
import whisper
import librosa
import webrtcvad
from pydantic import BaseModel

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ASRConfig(BaseModel):
    """ASR 配置类"""
    model_size: str = "base"  # 模型大小: tiny, base, small, medium, large
    language: str = "zh"  # 默认语言: zh, en
    sample_rate: int = 16000  # 采样率
    chunk_duration: float = 2.0  # 流式处理的块时长（秒）
    temperature: float = 0.0  # 解码温度
    beam_size: int = 5  # 束搜索大小
    vad_aggressiveness: int = 3  # VAD 激进程度 (0-3)


class ASRResult(BaseModel):
    """ASR 识别结果"""
    text: str  # 识别文本
    start_time: float  # 开始时间（秒）
    end_time: float  # 结束时间（秒）
    confidence: float  # 置信度
    language: str  # 识别语言


class WhisperASRService:
    """Whisper ASR 服务类"""
    
    def __init__(self, config: ASRConfig):
        """初始化 Whisper ASR 服务
        
        Args:
            config: ASR 配置对象
        """
        self.config = config
        self.model = None
        self.vad = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Whisper ASR 服务初始化，使用设备: {self.device}")
        
    async def initialize(self):
        """异步初始化模型"""
        try:
            logger.info(f"正在加载 Whisper {self.config.model_size} 模型...")
            self.model = whisper.load_model(
                self.config.model_size,
                device=self.device,
                download_root=None
            )
            
            # 初始化 VAD (语音活动检测)
            self.vad = webrtcvad.Vad(self.config.vad_aggressiveness)
            
            logger.info("Whisper 模型加载成功")
        except Exception as e:
            logger.error(f"模型初始化失败: {str(e)}")
            raise RuntimeError(f"Whisper 模型加载失败: {str(e)}")
    
    def _preprocess_audio(self, audio_data: np.ndarray) -> np.ndarray:
        """音频预处理
        
        Args:
            audio_data: 原始音频数据
            
        Returns:
            预处理后的音频数据
        """
        try:
            # 确保音频是一维数组
            if audio_data.ndim > 1:
                audio_data = audio_data.mean(axis=1)
            
            # 重采样到目标采样率
            if len(audio_data) > 0:
                current_sr = 48000  # 假设输入是 48kHz
                if current_sr != self.config.sample_rate:
                    audio_data = librosa.resample(
                        audio_data, 
                        orig_sr=current_sr, 
                        target_sr=self.config.sample_rate
                    )
            
            # 音量归一化 (防止音频过载)
            max_val = np.max(np.abs(audio_data))
            if max_val > 0:
                audio_data = audio_data / max_val * 0.95
            
            return audio_data.astype(np.float32)
            
        except Exception as e:
            logger.error(f"音频预处理失败: {str(e)}")
            raise
    
    def _apply_vad(self, audio_data: np.ndarray) -> List[bytes]:
        """应用语音活动检测
        
        Args:
            audio_data: 音频数据
            
        Returns:
            语音片段列表
        """
        try:
            # 将浮点音频转换为 16-bit PCM
            audio_int16 = (audio_data * 32767).astype(np.int16)
            audio_bytes = audio_int16.tobytes()
            
            # 帧持续时间 (VAD 需要 10, 20, 或 30ms 的帧)
            frame_duration = 30  # ms
            frame_length = int(self.config.sample_rate * frame_duration / 1000) * 2  # 16-bit = 2 bytes
            
            # 分帧并应用 VAD
            frames = []
            voice_frames = []
            
            for i in range(0, len(audio_bytes), frame_length):
                frame = audio_bytes[i:i + frame_length]
                if len(frame) < frame_length:
                    continue
                
                frames.append(frame)
                
                # 检测是否包含语音
                if self.vad.is_speech(frame, self.config.sample_rate):
                    voice_frames.append(frame)
            
            # 合并语音帧
            if voice_frames:
                return [b''.join(voice_frames)]
            return []
            
        except Exception as e:
            logger.error(f"VAD 处理失败: {str(e)}")
            return [audio_data.tobytes()]
    
    async def transcribe(
        self, 
        audio_data: np.ndarray,
        language: Optional[str] = None
    ) -> ASRResult:
        """识别音频
        
        Args:
            audio_data: 音频数据
            language: 指定语言，None 表示自动检测
            
        Returns:
            ASRResult 识别结果
        """
        try:
            # 预处理音频
            audio_data = self._preprocess_audio(audio_data)
            
            # 应用 VAD
            voice_segments = self._apply_vad(audio_data)
            
            if not voice_segments:
                logger.warning("未检测到语音")
                return ASRResult(
                    text="",
                    start_time=0.0,
                    end_time=0.0,
                    confidence=0.0,
                    language=self.config.language
                )
            
            # 合并所有语音片段
            voice_bytes = b''.join(voice_segments)
            voice_data = np.frombuffer(voice_bytes, dtype=np.int16).astype(np.float32) / 32767.0
            
            # Whisper 识别
            result = self.model.transcribe(
                voice_data,
                language=language or self.config.language,
                temperature=self.config.temperature,
                beam_size=self.config.beam_size,
                word_timestamps=True
            )
            
            # 获取识别结果
            text = result["text"].strip()
            
            # 获取时间戳
            segments = result.get("segments", [])
            if segments:
                start_time = segments[0].get("start", 0.0)
                end_time = segments[-1].get("end", 0.0)
                confidence = np.mean([s.get("no_speech_prob", 1.0) for s in segments])
                confidence = 1.0 - confidence  # 转换为置信度
            else:
                start_time = 0.0
                end_time = 0.0
                confidence = 0.0
            
            detected_lang = result.get("language", self.config.language)
            
            logger.info(f"识别完成: {text[:50]}...")
            
            return ASRResult(
                text=text,
                start_time=start_time,
                end_time=end_time,
                confidence=confidence,
                language=detected_lang
            )
            
        except Exception as e:
            logger.error(f"语音识别失败: {str(e)}")
            raise RuntimeError(f"语音识别失败: {str(e)}")
    
    async def transcribe_stream(
        self,
        audio_stream: AsyncGenerator[np.ndarray, None],
        language: Optional[str] = None
    ) -> AsyncGenerator[ASRResult, None]:
        """实时流式语音识别
        
        Args:
            audio_stream: 音频流生成器
            language: 指定语言
            
        Yields:
            ASRResult 识别结果
        """
        buffer = np.array([], dtype=np.float32)
        
        try:
            async for chunk in audio_stream:
                # 累积音频数据
                chunk_processed = self._preprocess_audio(chunk)
                buffer = np.concatenate([buffer, chunk_processed])
                
                # 检查缓冲区是否达到处理阈值
                target_length = int(self.config.sample_rate * self.config.chunk_duration)
                
                if len(buffer) >= target_length:
                    # 处理缓冲区中的音频
                    audio_to_process = buffer[:target_length]
                    buffer = buffer[target_length:]
                    
                    # 识别
                    result = await self.transcribe(audio_to_process, language)
                    
                    if result.text:
                        yield result
                
                # 让出控制权给其他任务
                await asyncio.sleep(0.01)
            
            # 处理剩余音频
            if len(buffer) > 0:
                result = await self.transcribe(buffer, language)
                if result.text:
                    yield result
                    
        except Exception as e:
            logger.error(f"流式识别错误: {str(e)}")
            raise
    
    def transcribe_file(
        self,
        audio_path: str,
        language: Optional[str] = None,
        return_timestamps: bool = True
    ) -> List[ASRResult]:
        """识别音频文件
        
        Args:
            audio_path: 音频文件路径
            language: 指定语言
            return_timestamps: 是否返回时间戳
            
        Returns:
            识别结果列表
        """
        try:
            # 加载音频文件
            audio_data, sr = librosa.load(audio_path, sr=self.config.sample_rate)
            
            # 应用 VAD
            voice_segments = self._apply_vad(audio_data)
            
            if not voice_segments:
                logger.warning(f"文件 {audio_path} 中未检测到语音")
                return []
            
            # 合并语音片段
            voice_bytes = b''.join(voice_segments)
            voice_data = np.frombuffer(voice_bytes, dtype=np.int16).astype(np.float32) / 32767.0
            
            # Whisper 识别
            result = self.model.transcribe(
                voice_data,
                language=language or self.config.language,
                word_timestamps=return_timestamps
            )
            
            # 转换结果
            results = []
            for segment in result.get("segments", []):
                results.append(ASRResult(
                    text=segment["text"].strip(),
                    start_time=segment["start"],
                    end_time=segment["end"],
                    confidence=1.0 - segment.get("no_speech_prob", 0.0),
                    language=result.get("language", self.config.language)
                ))
            
            logger.info(f"文件识别完成: {audio_path}, 片段数: {len(results)}")
            return results
            
        except Exception as e:
            logger.error(f"文件识别失败: {str(e)}")
            raise RuntimeError(f"文件识别失败: {str(e)}")
    
    def get_supported_languages(self) -> List[str]:
        """获取支持的语言列表
        
        Returns:
            支持的语言代码列表
        """
        # Whisper 支持的主要语言
        return [
            "zh",  # 中文
            "en",  # 英语
            "es",  # 西班牙语
            "fr",  # 法语
            "de",  # 德语
            "ja",  # 日语
            "ko",  # 韩语
            "ru",  # 俄语
        ]
    
    async def cleanup(self):
        """清理资源"""
        try:
            if self.model is not None:
                del self.model
                self.model = None
                logger.info("Whisper 模型资源已释放")
        except Exception as e:
            logger.error(f"资源清理失败: {str(e)}")


# 全局单例
_asr_service: Optional[WhisperASRService] = None


async def get_asr_service(config: Optional[ASRConfig] = None) -> WhisperASRService:
    """获取 ASR 服务单例
    
    Args:
        config: ASR 配置
        
    Returns:
        WhisperASRService 实例
    """
    global _asr_service
    
    if _asr_service is None:
        if config is None:
            config = ASRConfig()
        _asr_service = WhisperASRService(config)
        await _asr_service.initialize()
    
    return _asr_service