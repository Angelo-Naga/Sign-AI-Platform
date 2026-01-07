"""
WebSocket 连接处理器模块
处理实时视频流和翻译结果的 WebSocket 通信
"""
import json
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, status
from api.config import manager, settings

# 配置日志
logger = logging.getLogger(__name__)

# 创建 WebSocket 路由
websocket_router = APIRouter(prefix="/ws", tags=["WebSocket"])


@websocket_router.websocket("/video/{client_id}")
async def video_stream_websocket(websocket: WebSocket, client_id: str):
    """
    实时视频流 WebSocket 端点
    
    处理客户端发送的视频帧，返回实时的手语识别结果
    
    Args:
        websocket: WebSocket 连接对象
        client_id: 客户端唯一标识
    """
    await manager.connect(websocket, client_id)
    logger.info(f"客户端 {client_id} 已连接到视频流 WebSocket")
    
    try:
        # 发送连接成功消息
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "client_id": client_id,
            "message": "WebSocket 连接已建立"
        })
        
        while True:
            # 接收客户端消息
            data = await websocket.receive()
            
            # 处理文本消息
            if "text" in data:
                try:
                    message = json.loads(data["text"])
                    await handle_text_message(client_id, message)
                except json.JSONDecodeError as e:
                    logger.error(f"JSON 解析错误（客户端 {client_id}）: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "message": "无效的 JSON 格式"
                    })
            
            # 处理二进制数据（视频帧）
            elif "bytes" in data:
                await handle_video_frame(client_id, data["bytes"])
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        logger.info(f"客户端 {client_id} 已断开视频流 WebSocket")
        await broadcast_status(client_id, "disconnected")
        
    except Exception as e:
        logger.error(f"WebSocket 错误（客户端 {client_id}）: {e}")
        manager.disconnect(client_id)
        await broadcast_status(client_id, "error")


@websocket_router.websocket("/translation/{client_id}")
async def translation_websocket(websocket: WebSocket, client_id: str):
    """
    翻译结果 WebSocket 端点
    
    处理实时翻译结果的推送
    
    Args:
        websocket: WebSocket 连接对象
        client_id: 客户端唯一标识
    """
    await manager.connect(websocket, client_id)
    logger.info(f"客户端 {client_id} 已连接到翻译 WebSocket")
    
    try:
        # 发送连接成功消息
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "client_id": client_id,
            "message": "翻译 WebSocket 连接已建立"
        })
        
        while True:
            # 接收翻译请求
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                await handle_translation_request(client_id, message)
            except json.JSONDecodeError as e:
                logger.error(f"JSON 解析错误（客户端 {client_id}）: {e}")
                await websocket.send_json({
                    "type": "error",
                    "message": "无效的 JSON 格式"
                })
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        logger.info(f"客户端 {client_id} 已断开翻译 WebSocket")
        
    except Exception as e:
        logger.error(f"翻译 WebSocket 错误（客户端 {client_id}）: {e}")
        manager.disconnect(client_id)


async def handle_text_message(client_id: str, message: Dict[str, Any]) -> None:
    """
    处理客户端发送的文本消息
    
    Args:
        client_id: 客户端唯一标识
        message: 消息内容
    """
    message_type = message.get("type")
    
    if message_type == "ping":
        # 心跳检测
        await manager.send_personal_message({
            "type": "pong",
            "timestamp": message.get("timestamp")
        }, client_id)
        logger.debug(f"收到客户端 {client_id} 的心跳")
        
    elif message_type == "config":
        # 配置更新
        await handle_config_update(client_id, message.get("config", {}))
        
    elif message_type == "start_recognition":
        # 开始识别
        await manager.send_personal_message({
            "type": "recognition_status",
            "status": "started",
            "message": "手语识别已启动"
        }, client_id)
        logger.info(f"客户端 {client_id} 启动手语识别")
        
    elif message_type == "stop_recognition":
        # 停止识别
        await manager.send_personal_message({
            "type": "recognition_status",
            "status": "stopped",
            "message": "手语识别已停止"
        }, client_id)
        logger.info(f"客户端 {client_id} 停止手语识别")
        
    else:
        logger.warning(f"未知消息类型（客户端 {client_id}）: {message_type}")


async def handle_video_frame(client_id: str, frame_data: bytes) -> None:
    """
    处理视频帧数据
    
    Args:
        client_id: 客户端唯一标识
        frame_data: 视频帧二进制数据
    """
    # TODO: 在这里集成手语识别模型
    # 目前返回模拟结果
    
    result = {
        "type": "recognition_result",
        "client_id": client_id,
        "timestamp": None,
        "gesture": "hello",
        "confidence": 0.95,
        "translation": "你好"
    }
    
    # 发送识别结果回客户端
    await manager.send_personal_message(result, client_id)
    
    # 可选：广播到其他连接的客户端
    # await manager.broadcast(result, exclude_client_id=client_id)


async def handle_translation_request(client_id: str, message: Dict[str, Any]) -> None:
    """
    处理翻译请求
    
    Args:
        client_id: 客户端唯一标识
        message: 翻译请求消息
    """
    text = message.get("text", "")
    source_lang = message.get("source_lang", settings.DEFAULT_SOURCE_LANG)
    target_lang = message.get("target_lang", settings.DEFAULT_TARGET_LANG)
    
    if not text:
        await manager.send_personal_message({
            "type": "error",
            "message": "翻译文本不能为空"
        }, client_id)
        return
    
    # TODO: 在这里集成翻译引擎
    # 目前返回模拟结果
    
    translation_result = {
        "type": "translation_result",
        "original_text": text,
        "translated_text": f"[{target_lang}] {text}",
        "source_lang": source_lang,
        "target_lang": target_lang,
        "confidence": 0.98
    }
    
    await manager.send_personal_message(translation_result, client_id)
    logger.info(f"客户端 {client_id} 的翻译请求已处理: {text}")


async def handle_config_update(client_id: str, config: Dict[str, Any]) -> None:
    """
    处理配置更新
    
    Args:
        client_id: 客户端唯一标识
        config: 配置字典
    """
    # 验证配置
    valid_config = {}
    
    for key, value in config.items():
        if key in ["recognition_threshold", "translation_style", "output_format"]:
            valid_config[key] = value
    
    # 确认配置更新
    await manager.send_personal_message({
        "type": "config_updated",
        "config": valid_config,
        "message": "配置已更新"
    }, client_id)
    
    logger.info(f"客户端 {client_id} 的配置已更新: {valid_config}")


async def broadcast_status(client_id: str, status: str) -> None:
    """
    广播客户端连接状态
    
    Args:
        client_id: 客户端唯一标识
        status: 连接状态（connected/disconnected/error）
    """
    status_message = {
        "type": "client_status",
        "client_id": client_id,
        "status": status,
        "timestamp": None,
        "total_connections": manager.get_connection_count()
    }
    
    await manager.broadcast(status_message, exclude_client_id=client_id)


async def broadcast_translation_result(
    client_id: str,
    original_text: str,
    translated_text: str,
    source_lang: str,
    target_lang: str
) -> None:
    """
    广播翻译结果到所有连接的客户端
    
    Args:
        client_id: 发送翻译的客户端ID
        original_text: 原始文本
        translated_text: 翻译文本
        source_lang: 源语言
        target_lang: 目标语言
    """
    result_message = {
        "type": "broadcast_translation",
        "client_id": client_id,
        "original_text": original_text,
        "translated_text": translated_text,
        "source_lang": source_lang,
        "target_lang": target_lang,
        "timestamp": None
    }
    
    await manager.broadcast(result_message)
    logger.info(f"翻译结果已广播: {original_text} -> {translated_text}")


async def broadcast_recognition_result(
    client_id: str,
    gesture: str,
    translation: str,
    confidence: float
) -> None:
    """
    广播手语识别结果到所有连接的客户端
    
    Args:
        client_id: 发送识别的客户端ID
        gesture: 识别的手语动作
        translation: 翻译结果
        confidence: 置信度
    """
    result_message = {
        "type": "broadcast_recognition",
        "client_id": client_id,
        "gesture": gesture,
        "translation": translation,
        "confidence": confidence,
        "timestamp": None
    }
    
    await manager.broadcast(result_message)
    logger.info(f"识别结果已广播: {gesture} ({confidence:.2f}) -> {translation}")


# 导出的工具函数
__all__ = [
    "websocket_router",
    "broadcast_translation_result",
    "broadcast_recognition_result"
]