/**
 * 声音克隆流程 E2E 测试
 */

describe('声音克隆流程测试', () => {
  beforeEach(() => {
    cy.visit('/clone');
  });

  it('应该显示声音克隆页面', () => {
    cy.contains('Voice Cloning', { matchCase: false }).should('be.visible');
  });

  it('应该显示上传音频按钮', () => {
    cy.get('[data-testid="upload-audio-button"]').should('be.visible');
    cy.get('[data-testid="upload-audio-input"]').should('exist');
  });

  it('应该支持上传音频文件', () => {
    // 创建测试音频文件
    cy.fixture('test-audio.mp3', 'base64').then((fileContent) => {
      cy.get('[data-testid="upload-audio-input"]').attachFile({
        fileContent,
        fileName: 'test-audio.mp3',
        mimeType: 'audio/mpeg'
      });
    });
    
    // 验证文件上传成功
    cy.get('[data-testid="audio-preview"]').should('be.visible');
    cy.get('[data-testid="audio-file-name"]').should('not.be.empty');
  });

  it('应该显示音频播放器', () => {
    cy.fixture('test-audio.mp3', 'base64').then((fileContent) => {
      cy.get('[data-testid="upload-audio-input"]').attachFile({
        fileContent,
        fileName: 'test-audio.mp3',
        mimeType: 'audio/mpeg'
      });
    });
    
    cy.get('[data-testid="audio-player"]').should('be.visible');
  });

  it('应该支持输入目标文本', () => {
    const targetText = '这是一段测试文本';
    
    cy.get('[data-testid="target-text-input"]').clear();
    cy.get('[data-testid="target-text-input"]').type(targetText);
    
    cy.get('[data-testid="target-text-input"]').should('have.value', targetText);
  });

  it('应该能够开始声音克隆', () => {
    // 上传音频
    cy.fixture('test-audio.mp3', 'base64').then((fileContent) => {
      cy.get('[data-testid="upload-audio-input"]').attachFile({
        fileContent,
        fileName: 'test-audio.mp3',
        mimeType: 'audio/mpeg'
      });
    });
    
    // 输入文本
    cy.get('[data-testid="target-text-input"]').type('测试');
    
    // 点击克隆按钮
    cy.get('[data-testid="clone-button"]').click();
    
    // 检查克隆进度
    cy.get('[data-testid="clone-progress"]').should('be.visible');
  });

  it('应该显示克隆进度', () => {
    cy.fixture('test-audio.mp3', 'base64').then((fileContent) => {
      cy.get('[data-testid="upload-audio-input"]').attachFile({
        fileContent,
        fileName: 'test-audio.mp3',
        mimeType: 'audio/mpeg'
      });
    });
    
    cy.get('[data-testid="target-text-input"]').type('测试');
    cy.get('[data-testid="clone-button"]').click();
    
    // 验证进度条显示
    cy.get('[data-testid="progress-bar"]').should('be.visible');
    cy.get('[data-testid="progress-text"]').should('not.be.empty');
  });

  it('应该显示克隆成功的结果', () => {
    cy.fixture('test-audio.mp3', 'base64').then((fileContent) => {
      cy.get('[data-testid="upload-audio-input"]').attachFile({
        fileContent,
        fileName: 'test-audio.mp3',
        mimeType: 'audio/mpeg'
      });
    });
    
    cy.get('[data-testid="target-text-input"]').type('测试');
    cy.get('[data-testid="clone-button"]').click();
    
    // 等待克隆完成
    cy.get('[data-testid="clone-success"]', { timeout: 30000 }).should('be.visible');
    cy.get('[data-testid="result-audio-player"]').should('be.visible');
  });

  it('应该支持下载克隆的音频', () => {
    cy.fixture('test-audio.mp3', 'base64').then((fileContent) => {
      cy.get('[data-testid="upload-audio-input"]').attachFile({
        fileContent,
        fileName: 'test-audio.mp3',
        mimeType: 'audio/mpeg'
      });
    });
    
    cy.get('[data-testid="target-text-input"]').type('测试');
    cy.get('[data-testid="clone-button"]').click();
    
    // 等待克隆完成
    cy.get('[data-testid="clone-success"]', { timeout: 30000 }).should('be.visible');
    
    // 下载音频
    cy.get('[data-testid="download-button"]').should('not.be.disabled');
  });

  it('应该支持保存声音配置', () => {
    const voiceName = '测试声音';
    
    cy.fixture('test-audio.mp3', 'base64').then((fileContent) => {
      cy.get('[data-testid="upload-audio-input"]').attachFile({
        fileContent,
        fileName: 'test-audio.mp3',
        mimeType: 'audio/mpeg'
      });
    });
    
    cy.get('[data-testid="voice-name-input"]').type(voiceName);
    cy.get('[data-testid="save-voice-button"]').click();
    
    // 验证保存成功
    cy.get('[data-testid="voice-saved-message"]').should('be.visible');
  });

  it('应该显示已保存的声音列表', () => {
    cy.get('[data-testid="saved-voices-list"]').should('be.visible');
    cy.get('[data-testid="voice-item"]').should('exist');
  });

  it('应该支持删除保存的声音', () => {
    cy.get('[data-testid="saved-voices-list"]').should('be.visible');
    cy.get('[data-testid="voice-delete-button"]').first().click();
    
    // 确认删除
    cy.get('[data-testid="confirm-delete-button"]').click();
    
    cy.get('[data-testid="delete-success-message"]').should('be.visible');
  });
});