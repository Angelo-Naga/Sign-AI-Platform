"""
TTS 语音合成服务
基于 edge-tts 实现文本转语音功能
支持多语言、情感标注和流式音频生成
"""

import logging
import asyncio
import re
from typing import Optional, List, Dict, Any, AsyncGenerator
from pathlib import Path
import edge_tts
import io
from pydub import AudioSegment
import numpy as np

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TTSConfig(BaseModel):
    """TTS 配置类"""
    voice: str = "zh-CN-XiaoxiaoNeural"  # 默认语音
    rate: str = "+0%"  # 语速调整 (-50% 到 +100%)
    pitch: str = "+0Hz"  # 音调调整 (-10Hz 到 +10Hz)
    volume: str = "+0%"  # 音量调整 (0% 到 +100%)
    output_format: str = "audio-24khz-48kbitrate-mono-mp3"  # 输出格式
    language: str = "zh-CN"  # 语言


class TTSSegment(BaseModel):
    """TTS 文本分段"""
    text: str  # 文本内容
    emotion: Optional[str] = None  # 情感标注
    pause_before: int = 0  # 前停顿（毫秒）
    pause_after: int = 0  # 后停顿（毫秒）


class TTSResult(BaseModel):
    """TTS 合成结果"""
    audio_data: bytes  # 音频数据
    duration: float  # 时长（秒）
    format: str  # 音频格式
    sample_rate: int = 24000  # 采样率


class TTSEngine:
    """TTS 语音合成引擎类"""
    
    # 支持的语音列表
    SUPPORTED_VOICES = {
        "zh-CN": [
            "zh-CN-XiaoxiaoNeural", "zh-CN-YunxiNeural",
            "zh-CN-YunyangNeural", "zh-CN-YunjianNeural",
        ],
        "en-US": [
            "en-US-JennyNeural", "en-US-GuyNeural",
            "en-US-AriaNeural", "en-US-DavisNeural",
        ],
        "ja-JP": [
            "ja-JP-NanamiNeural", "ja-JP-KeitaNeural",
        ],
        "ko-KR": [
            "ko-KR-SunHiNeural", "ko-KR-InJoonNeural",
        ],
    }
    
    # 支持的情感标签
    EMOTION_STYLES = {
        "neutral": "neutral",
        "happy": "cheerful",
        "sad": "sad",
        "angry": "angry",
        "excited": "excited",
        "calm": "calm",
        "friendly": "friendly",
        "serious": "serious",
    }
    
    def __init__(self, config: TTSConfig):
        """初始化 TTS 引擎
        
        Args:
            config: TTS 配置对象
        """
        self.config = config
        logger.info(f"TTS 引擎初始化，语音: {config.voice}")
    
    def _split_text_into_sentences(self, text: str) -> List[str]:
        """将文本分割成句子
        
        Args:
            text: 输入文本
            
        Returns:
            句子列表
        """
        # 中文和英文的分句符号
        sentence_endings = r'[。！？.!?；;]'
        sentences = re.split(sentence_endings, text)
        
        # 过滤空句子
        sentences = [s.strip() for s in sentences if s.strip()]
        
        return sentences
    
    def _preprocess_text(self, text: str) -> str:
        """预处理文本
        
        Args:
            text: 原始文本
            
        Returns:
            预处理后的文本
        """
        # 移除多余空格
        text = re.sub(r'\s+', ' ', text)
        
        # 处理数字（可选：将数字转换为中文）
        # text = self._convert_numbers_to_chinese(text)
        
        return text.strip()
    
    def _build_ssml(
        self, 
        text: str, 
        emotion: Optional[str] = None
    ) -> str:
        """构建 SSML 格式的语音合成标记
        
        Args:
            text: 文本内容
            emotion: 情感标签
            
        Returns:
            SSML 字符串
        """
        # 获取情感标记
        style = "neutral"
        if emotion and emotion.lower() in self.EMOTION_STYLES:
            style = self.EMOTION_STYLES[emotion.lower()]
        
        # 构建 SSML
        ssml = f"""
        <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='{self.config.language}'>
            <voice name='{self.config.voice}'>
                <prosody rate='{self.config.rate}' pitch='{self.config.pitch}' volume='{self.config.volume}'>
                    <mstts:express-as style='{style}' styledegree='2'>
                        {text}
                    </mstts:express-as>
                </prosody>
            </voice>
        </speak>
        """
        
        return ssml.strip()
    
    async def synthesize(
        self,
        text: str,
        emotion: Optional[str] = None,
        output_format: Optional[str] = None
    ) -> TTSResult:
        """文本转语音
        
        Args:
            text: 输入文本
            emotion: 情感标注
            output_format: 输出格式
            
        Returns:
            TTSResult 合成结果
        """
        try:
            # 预处理文本
            text = self._preprocess_text(text)
            
            if not text:
                logger.warning("输入文本为空")
                return TTSResult(
                    audio_data=b"",
                    duration=0.0,
                    format=output_format or self.config.output_format
                )
            
            # 构建 SSML
            ssml = self._build_ssml(text, emotion)
            
            # 创建 communicate 对象
            communicate = edge_tts.Communicate(
                ssml,
                voice=self.config.voice
            )
            
            # 获取音频数据
            audio_data = bytearray()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data.extend(chunk["data"])
            
            # 计算时长
            audio_segment = AudioSegment.from_mp3(io.BytesIO(audio_data))
            duration = len(audio_segment) / 1000.0  # 转换为秒
            
            logger.info(f"TTS 合成完成: {text[:30]}..., 时长: {duration:.2f}s")
            
            return TTSResult(
                audio_data=bytes(audio_data),
                duration=duration,
                format=output_format or self.config.output_format,
                sample_rate=audio_segment.frame_rate
            )
            
        except Exception as e:
            logger.error(f"语音合成失败: {str(e)}")
            raise RuntimeError(f"语音合成失败: {str(e)}")
    
    async def synthesize_segments(
        self,
        segments: List[TTSSegment],
        output_format: Optional[str] = None
    ) -> TTSResult:
        """批量合成分段文本
        
        Args:
            segments: 文本分段列表
            output_format: 输出格式
            
        Returns:
            TTSResult 合成结果（合并后）
        """
        try:
            combined_audio = AudioSegment.empty()
            
            for i, segment in enumerate(segments):
                # 合成当前分段
                result = await self.synthesize(
                    segment.text,
                    segment.emotion,
                    output_format
                )
                
                if result.audio_data:
                    audio_segment = AudioSegment.from_mp3(
                        io.BytesIO(result.audio_data)
                    )
                    
                    # 添加前停顿
                    if segment.pause_before > 0:
                        combined_audio += AudioSegment.silent(
                            duration=segment.pause_before
                        )
                    
                    # 添加音频
                    combined_audio += audio_segment
                    
                    # 添加后停顿（最后一个分段不加）
                    if segment.pause_after > 0 and i < len(segments) - 1:
                        combined_audio += AudioSegment.silent(
                            duration=segment.pause_after
                        )
            
            # 导出为 MP3
            audio_buffer = io.BytesIO()
            combined_audio.export(audio_buffer, format="mp3")
            audio_data = audio_buffer.getvalue()
            
            duration = len(combined_audio) / 1000.0
            
            logger.info(f"批量合成完成: {len(segments)} 个分段, 总时长: {duration:.2f}s")
            
            return TTSResult(
                audio_data=audio_data,
                duration=duration,
                format=output_format or self.config.output_format,
                sample_rate=combined_audio.frame_rate
            )
            
        except Exception as e:
            logger.error(f"批量合成失败: {str(e)}")
            raise RuntimeError(f"批量合成失败: {str(e)}")
    
    async def synthesize_stream(
        self,
        text: str,
        emotion: Optional[str] = None,
        chunk_size: int = 1024
    ) -> AsyncGenerator[bytes, None]:
        """流式语音合成
        
        Args:
            text: 输入文本
            emotion: 情感标注
            chunk_size: 流块大小
            
        Yields:
            音频数据流块
        """
        try:
            # 预处理文本
            text = self._preprocess_text(text)
            
            if not text:
                return
            
            # 构建 SSML
            ssml = self._build_ssml(text, emotion)
            
            # 创建 communicate 对象
            communicate = edge_tts.Communicate(
                ssml,
                voice=self.config.voice
            )
            
            # 流式返回音频
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]
                    
        except Exception as e:
            logger.error(f"流式合成失败: {str(e)}")
            raise RuntimeError(f"流式合成失败: {str(e)}")
    
    async def synthesize_to_file(
        self,
        text: str,
        output_path: str,
        emotion: Optional[str] = None
    ) -> float:
        """合成并保存到文件
        
        Args:
            text: 输入文本
            output_path: 输出文件路径
            emotion: 情感标注
            
        Returns:
            音频时长（秒）
        """
        try:
            # 合成音频
            result = await self.synthesize(text, emotion)
            
            # 保存到文件
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, "wb") as f:
                f.write(result.audio_data)
            
            logger.info(f"音频已保存到: {output_path}")
            return result.duration
            
        except Exception as e:
            logger.error(f"保存音频失败: {str(e)}")
            raise RuntimeError(f"保存音频失败: {str(e)}")
    
    def convert_audio_format(
        self,
        audio_data: bytes,
        input_format: str,
        output_format: str,
        sample_rate: int = 24000
    ) -> bytes:
        """转换音频格式
        
        Args:
            audio_data: 输入音频数据
            input_format: 输入格式
            output_format: 输出格式
            sample_rate: 采样率
            
        Returns:
            转换后的音频数据
        """
        try:
            # 加载音频
            audio_segment = AudioSegment.from_file(
                io.BytesIO(audio_data),
                format=input_format
            )
            
            # 设置采样率
            if audio_segment.frame_rate != sample_rate:
                audio_segment = audio_segment.set_frame_rate(sample_rate)
            
            # 导出为目标格式
            output_buffer = io.BytesIO()
            audio_segment.export(output_buffer, format=output_format)
            
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"音频格式转换失败: {str(e)}")
            raise RuntimeError(f"音频格式转换失败: {str(e)}")
    
    def get_supported_voices(self, language: Optional[str] = None) -> List[str]:
        """获取支持的语音列表
        
        Args:
            language: 语言代码，None 表示返回所有
            
        Returns:
            语音名称列表
        """
        if language:
            return self.SUPPORTED_VOICES.get(language, [])
        return [voice for voices in self.SUPPORTED_VOICES.values() for voice in voices]
    
    def get_supported_emotions(self) -> List[str]:
        """获取支持的情感标签
        
        Returns:
            情感标签列表
        """
        return list(self.EMOTION_STYLES.keys())


# 全局单例
_tts_engine: Optional[TTSEngine] = None


async def get_tts_engine(config: Optional[TTSConfig] = None) -> TTSEngine:
    """获取 TTS 引擎单例
    
    Args:
        config: TTS 配置
        
    Returns:
        TTSEngine 实例
    """
    global _tts_engine
    
    if _tts_engine is None:
        if config is None:
            config = TTSConfig()
        _tts_engine = TTSEngine(config)
    
    return _tts_engine