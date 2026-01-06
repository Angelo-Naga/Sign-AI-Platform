/**
 * WebSocket 服务单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketService } from '@/services/websocket';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;
  url: string;
  onopen: any = null;
  onmessage: any = null;
  onerror: any = null;
  onclose: any = null;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen({ type: 'open' });
    }, 100);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose({ type: 'close' });
  }
}

describe('WebSocket 服务', () => {
  let webSocketService: WebSocketService;

  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('应该正确创建 WebSocket 连接', async () => {
    webSocketService = new WebSocketService('ws://localhost:8000/ws');
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    expect(webSocketService.isConnected()).toBe(true);
  });

  it('应该正确发送消息', async () => {
    webSocketService = new WebSocketService('ws://localhost:8000/ws');
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const message = { type: 'test', data: 'hello' };
    
    expect(() => {
      webSocketService.send(message);
    }).not.toThrow();
  });

  it('应该正确接收消息', async () => {
    webSocketService = new WebSocketService('ws://localhost:8000/ws');
    
    const onMessage = vi.fn();
    webSocketService.onMessage(onMessage);
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 模拟接收消息
    const ws = webSocketService as any;
    ws.onmessage({ data: JSON.stringify({ type: 'test' }) });
    
    expect(onMessage).toHaveBeenCalledWith({ type: 'test' });
  });

  it('应该正确处理连接关闭', async () => {
    webSocketService = new WebSocketService('ws://localhost:8000/ws');
    
    const onClose = vi.fn();
    webSocketService.onClose(onClose);
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    webSocketService.disconnect();
    
    expect(webSocketService.isConnected()).toBe(false);
  });

  it('应该正确处理重连', async () => {
    webSocketService = new WebSocketService('ws://localhost:8000/ws', {
      reconnect: true,
      reconnectInterval: 100
    });
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 第一次连接成功
    expect(webSocketService.isConnected()).toBe(true);
    
    webSocketService.disconnect();
    await new Promise(resolve => setTimeout(resolve, 200));
    
    expect(webSocketService.isConnected()).toBe(true);
  });
});