const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

// Singleton Local HTTP Range Streaming Server
// Handles 20GB+ video files via native HTTP 206 Partial Content without consuming memory or freezing the IDE.
class LocalVideoServer {
  constructor() {
    this.server = null;
    this.port = 0;
    this.activeFiles = new Map(); // token -> { filePath, fileSize, mimeType }
  }

  async start() {
    if (this.server) return this.port;

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        // CORS Headers for VS Code Webview
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        try {
          const url = new URL(req.url, `http://127.0.0.1:${this.port}`);
          const token = url.searchParams.get('token');
          const fileInfo = this.activeFiles.get(token);

          if (!fileInfo || !fs.existsSync(fileInfo.filePath)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Video not found or token expired');
            return;
          }

          const { filePath, fileSize, mimeType } = fileInfo;
          const range = req.headers.range;

          if (!range) {
            // No range header: return 200 with Accept-Ranges
            const headers = {
              'Content-Length': fileSize,
              'Content-Type': mimeType,
              'Accept-Ranges': 'bytes',
              'Cache-Control': 'no-cache'
            };
            res.writeHead(200, headers);
            if (req.method === 'HEAD') {
              res.end();
            } else {
              // Only stream first 2MB if full file is requested without Range
              const stream = fs.createReadStream(filePath, { start: 0, end: Math.min(fileSize - 1, 2097151) });
              stream.pipe(res);
              req.on('close', () => stream.destroy());
            }
            return;
          }

          // Parse 64-bit HTTP Range: bytes=start-end
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

          if (isNaN(start) || start >= fileSize || end >= fileSize || start > end) {
            res.writeHead(416, {
              'Content-Range': `bytes */${fileSize}`,
              'Content-Type': 'text/plain'
            });
            res.end();
            return;
          }

          // Cap max chunk to 16MB to optimize socket throughput and avoid buffering bottlenecks
          const maxChunk = 16 * 1024 * 1024;
          if (end - start + 1 > maxChunk) {
            end = start + maxChunk - 1;
          }

          const chunkSize = (end - start) + 1;
          const stream = fs.createReadStream(filePath, { start, end });

          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': mimeType,
            'Cache-Control': 'no-cache'
          });

          stream.pipe(res);

          stream.on('error', () => {
            if (!res.headersSent) {
              res.writeHead(500);
            }
            res.end();
          });

          req.on('close', () => {
            stream.destroy();
          });
        } catch {
          if (!res.headersSent) {
            res.writeHead(500);
          }
          res.end();
        }
      });

      this.server.listen(0, '127.0.0.1', () => {
        this.port = this.server.address().port;
        resolve(this.port);
      });

      this.server.on('error', reject);
    });
  }

  registerFile(filePath) {
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      stat = { size: 0 };
    }

    const ext = path.extname(filePath).toLowerCase();
    // Chromium plays H.264/AAC MOV files as video/mp4 container
    let mimeType = 'video/mp4';
    if (ext === '.webm') mimeType = 'video/webm';

    const token = crypto.randomBytes(16).toString('hex');
    this.activeFiles.set(token, {
      filePath,
      fileSize: stat.size,
      mimeType
    });

    const videoUrl = `http://127.0.0.1:${this.port}/video?token=${token}`;
    return { token, videoUrl, fileSize: stat.size };
  }

  unregisterFile(token) {
    this.activeFiles.delete(token);
  }

  dispose() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.activeFiles.clear();
  }
}

const localVideoServer = new LocalVideoServer();

function activate(context) {
  // Ensure local server is cleaned up on deactivate
  context.subscriptions.push({
    dispose: () => localVideoServer.dispose()
  });

  // 1. Custom Editor Provider (Default priority for video files)
  context.subscriptions.push(SimpleVideoPlayerEditorProvider.register(context));

  // 2. Open Video Command
  const playCmd = vscode.commands.registerCommand('simple-video-player.play', async (uri) => {
    let targetUri = uri;
    if (!targetUri) {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        targetUri = activeEditor.document.uri;
      }
    }
    if (!targetUri || !targetUri.fsPath) {
      vscode.window.showErrorMessage('Please select a video file.');
      return;
    }

    const filePath = targetUri.fsPath;
    const ext = path.extname(filePath).toLowerCase();
    const validExts = ['.mp4', '.mov', '.m4v', '.webm'];
    if (!validExts.includes(ext)) {
      vscode.window.showErrorMessage('Unsupported video format (supports MP4, MOV, M4V, WebM).');
      return;
    }

    await vscode.commands.executeCommand('vscode.openWith', targetUri, 'simple-video-player.editor');
  });

  // 3. Open in External App (QuickTime / VLC / Default OS Player)
  const openExternalCmd = vscode.commands.registerCommand('simple-video-player.openExternal', async (uri) => {
    let targetUri = uri;
    if (!targetUri) {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        targetUri = activeEditor.document.uri;
      }
    }
    if (targetUri) {
      await vscode.env.openExternal(targetUri);
    }
  });

  context.subscriptions.push(playCmd, openExternalCmd);
}

class SimpleVideoPlayerEditorProvider {
  static register(context) {
    const provider = new SimpleVideoPlayerEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(
      'simple-video-player.editor',
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
          enableScripts: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  constructor(context) {
    this.context = context;
  }

  async openCustomDocument(uri) {
    return { uri, dispose: () => {} };
  }

  async resolveCustomEditor(document, webviewPanel) {
    const filePath = document.uri.fsPath;
    const fileDir = vscode.Uri.file(path.dirname(filePath));

    // Ensure Local HTTP Range Server is running
    await localVideoServer.start();
    const { token, videoUrl, fileSize } = localVideoServer.registerFile(filePath);

    // Unregister file token when Webview panel is closed
    webviewPanel.onDidDispose(() => {
      localVideoServer.unregisterFile(token);
    });

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        fileDir,
        this.context.extensionUri
      ]
    };

    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();

    let mimeType = 'video/mp4';
    if (ext === '.webm') mimeType = 'video/webm';

    const formattedSize = formatBytes(fileSize);

    // Read user configuration
    const config = vscode.workspace.getConfiguration('simple-video-player');
    const autoLoopDefault = this.context.globalState.get('simple-video-player.lastLoopState', config.get('autoLoop', true));
    const autoPlay = config.get('autoPlay', true);
    const defaultVolume = config.get('defaultVolume', 1.0);
    const skipSeconds = config.get('skipSeconds', 10);

    // Look for subtitles (.vtt or .srt with same base name or in directory)
    let subtitleWebviewUri = null;
    let subtitleLabel = null;
    try {
      const baseNoExt = filePath.slice(0, -ext.length);
      const vttCandidate = baseNoExt + '.vtt';
      const srtCandidate = baseNoExt + '.srt';
      if (fs.existsSync(vttCandidate)) {
        subtitleWebviewUri = webviewPanel.webview.asWebviewUri(vscode.Uri.file(vttCandidate));
        subtitleLabel = path.basename(vttCandidate);
      } else if (fs.existsSync(srtCandidate)) {
        subtitleWebviewUri = webviewPanel.webview.asWebviewUri(vscode.Uri.file(srtCandidate));
        subtitleLabel = path.basename(srtCandidate);
      }
    } catch {
      // Subtitle detection is optional
    }

    // Handle messages from webview
    webviewPanel.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case 'openExternal':
          await vscode.env.openExternal(document.uri);
          break;
        case 'revealInExplorer':
          await vscode.commands.executeCommand('revealFileInOS', document.uri);
          break;
        case 'saveLoopState':
          await this.context.globalState.update('simple-video-player.lastLoopState', msg.value);
          break;
        case 'showError':
          vscode.window.showErrorMessage(msg.message);
          break;
      }
    });

    webviewPanel.webview.html = this.getHtmlForWebview(
      webviewPanel.webview,
      fileName,
      videoUrl,
      mimeType,
      formattedSize,
      fileSize,
      autoLoopDefault,
      autoPlay,
      defaultVolume,
      skipSeconds,
      subtitleWebviewUri,
      subtitleLabel
    );
  }

  getHtmlForWebview(
    webview,
    fileName,
    videoSrc,
    mimeType,
    fileSize,
    rawSizeBytes,
    autoLoop,
    autoPlay,
    defaultVolume,
    skipSeconds,
    subtitleSrc,
    subtitleLabel
  ) {
    const cspSource = webview.cspSource;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; media-src http://127.0.0.1:* http://localhost:* ${cspSource} vscode-webview: vscode-resource: blob: data:; img-src ${cspSource} data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <title>${escapeHtml(fileName)}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
    }
    body, html {
      width: 100%;
      height: 100%;
      background-color: #0d0f12;
      color: #e6edf3;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    #player-container {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #000;
      outline: none;
    }

    video {
      width: 100%;
      height: 100%;
      max-height: 100%;
      object-fit: contain;
      outline: none;
      cursor: pointer;
    }

    #top-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 56px;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%);
      z-index: 10;
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: auto;
    }

    .top-left {
      display: flex;
      align-items: center;
      gap: 12px;
      overflow: hidden;
    }

    .video-title {
      font-size: 15px;
      font-weight: 500;
      letter-spacing: 0.2px;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-shadow: 0 1px 4px rgba(0,0,0,0.8);
    }

    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.18);
      color: #d1d5db;
      white-space: nowrap;
      backdrop-filter: blur(8px);
    }

    .badge-stream {
      background: rgba(16, 185, 129, 0.25);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.3);
    }

    .top-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      padding: 5px 10px;
      font-size: 12px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s ease;
      backdrop-filter: blur(8px);
    }
    .header-btn:hover {
      background: rgba(255, 255, 255, 0.25);
      border-color: rgba(255, 255, 255, 0.35);
    }

    #bottom-bar-wrapper {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0 16px 14px 16px;
      background: linear-gradient(0deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 65%, transparent 100%);
      z-index: 10;
      transition: opacity 0.3s ease, transform 0.3s ease;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: auto;
    }

    .controls-hidden #top-bar {
      opacity: 0;
      transform: translateY(-8px);
      pointer-events: none;
    }
    .controls-hidden #bottom-bar-wrapper {
      opacity: 0;
      transform: translateY(8px);
      pointer-events: none;
    }
    .controls-hidden video {
      cursor: none;
    }

    .controls-bar {
      height: 44px;
      background: rgba(24, 26, 31, 0.88);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      display: flex;
      align-items: center;
      padding: 0 12px;
      gap: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }

    .ctrl-btn {
      background: transparent;
      border: none;
      color: #e5e7eb;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .ctrl-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
    }
    .ctrl-btn:active {
      transform: scale(0.95);
    }

    .ctrl-btn.btn-active-blue {
      background: #007acc !important;
      color: #ffffff !important;
      box-shadow: 0 0 10px rgba(0, 122, 204, 0.55);
    }
    .ctrl-btn.btn-active-blue:hover {
      background: #0088e5 !important;
    }

    .ab-btn {
      font-size: 13px;
      font-weight: 700;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.05);
      color: #9ca3af;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .ab-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
    }
    .ab-btn.active {
      background: #eab308;
      border-color: #facc15;
      color: #000000;
      font-weight: 800;
    }

    .volume-group {
      display: flex;
      align-items: center;
      gap: 4px;
      position: relative;
    }
    .volume-slider-wrap {
      width: 0;
      overflow: hidden;
      transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
    }
    .volume-group:hover .volume-slider-wrap,
    .volume-slider-wrap.show-slider {
      width: 70px;
      margin-right: 4px;
    }
    .volume-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 65px;
      height: 4px;
      border-radius: 2px;
      background: #4b5563;
      outline: none;
      cursor: pointer;
    }
    .volume-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #007acc;
      cursor: pointer;
      box-shadow: 0 0 4px rgba(0,0,0,0.4);
    }

    .seekbar-container {
      flex: 1;
      height: 28px;
      display: flex;
      align-items: center;
      position: relative;
      cursor: pointer;
      margin: 0 4px;
    }
    .seekbar-bg {
      position: relative;
      width: 100%;
      height: 4px;
      background: #374151;
      border-radius: 2px;
      transition: height 0.15s ease;
    }
    .seekbar-container:hover .seekbar-bg {
      height: 6px;
    }
    .seekbar-buffer {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      background: #6b7280;
      border-radius: 2px;
      width: 0%;
      pointer-events: none;
    }
    .seekbar-progress {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      background: #007acc;
      border-radius: 2px;
      width: 0%;
      pointer-events: none;
    }
    .seekbar-thumb {
      position: absolute;
      top: 50%;
      left: 0%;
      width: 13px;
      height: 13px;
      background: #38bdf8;
      border: 2px solid #ffffff;
      border-radius: 50%;
      transform: translate(-50%, -50%) scale(1);
      box-shadow: 0 1px 4px rgba(0,0,0,0.6);
      transition: transform 0.1s ease;
      pointer-events: none;
    }
    .seekbar-container:hover .seekbar-thumb {
      transform: translate(-50%, -50%) scale(1.25);
    }

    .ab-marker {
      position: absolute;
      top: -3px;
      width: 3px;
      height: 12px;
      border-radius: 1px;
      pointer-events: none;
      z-index: 2;
    }
    .ab-marker-a {
      background: #facc15;
    }
    .ab-marker-b {
      background: #f87171;
    }
    .ab-highlight-range {
      position: absolute;
      top: 0;
      height: 100%;
      background: rgba(250, 204, 21, 0.4);
      pointer-events: none;
      z-index: 1;
    }

    #seek-tooltip {
      position: absolute;
      bottom: 34px;
      transform: translateX(-50%);
      background: rgba(17, 24, 39, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 6px;
      border-radius: 4px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      white-space: nowrap;
      z-index: 20;
    }

    .time-display {
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      color: #d1d5db;
      white-space: nowrap;
      margin: 0 4px;
    }

    .speed-container {
      position: relative;
    }
    .speed-btn {
      font-size: 12px;
      font-weight: 600;
      color: #e5e7eb;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 4px;
      white-space: nowrap;
      transition: background 0.15s ease;
    }
    .speed-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
    }
    .speed-menu {
      position: absolute;
      bottom: 40px;
      right: 0;
      background: #1f242d;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      padding: 4px 0;
      box-shadow: 0 6px 18px rgba(0,0,0,0.5);
      display: none;
      flex-direction: column;
      z-index: 30;
      min-width: 80px;
    }
    .speed-menu.show {
      display: flex;
    }
    .speed-item {
      padding: 6px 12px;
      font-size: 12px;
      color: #cbd5e1;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s;
    }
    .speed-item:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }
    .speed-item.active {
      color: #38bdf8;
      font-weight: 700;
      background: rgba(56, 189, 248, 0.12);
    }

    #error-overlay {
      position: absolute;
      inset: 0;
      background: rgba(13, 15, 18, 0.95);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
      z-index: 50;
    }
    #error-overlay.show {
      display: flex;
    }
    .error-icon {
      font-size: 44px;
      margin-bottom: 16px;
      color: #f59e0b;
    }
    .error-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #f3f4f6;
    }
    .error-desc {
      font-size: 13px;
      color: #9ca3af;
      max-width: 520px;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .error-btn {
      background: #007acc;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .error-btn:hover {
      background: #008be5;
    }

    #toast {
      position: absolute;
      top: 68px;
      left: 50%;
      transform: translateX(-50%) translateY(-10px);
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #f8fafc;
      font-size: 12px;
      font-weight: 500;
      padding: 6px 14px;
      border-radius: 20px;
      pointer-events: none;
      opacity: 0;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 40;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    #toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    #center-indicator {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.6);
      width: 72px;
      height: 72px;
      background: rgba(0, 0, 0, 0.65);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      z-index: 15;
    }
    #center-indicator.animate {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  </style>
</head>
<body>
  <div id="player-container" tabindex="0">
    <div id="top-bar">
      <div class="top-left">
        <span class="video-title" id="title-text" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</span>
        <span class="badge" id="size-badge">${escapeHtml(fileSize)}</span>
        <span class="badge badge-stream" title="Direct 64-bit HTTP Range Streaming (Zero memory consumption)">HTTP 206 Stream</span>
        <span class="badge" id="res-badge" style="display:none;"></span>
      </div>
      <div class="top-right">
        <button class="header-btn" id="btn-reveal" title="Show in File Explorer / Finder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          Finder
        </button>
        <button class="header-btn" id="btn-external" title="Open with OS Default Player (QuickTime / VLC)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          External
        </button>
      </div>
    </div>

    <div id="center-indicator">
      <svg id="indicator-icon" width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    </div>

    <!-- Video Element using direct HTTP 206 Range Streamer -->
    <video
      id="video"
      src="${videoSrc}"
      preload="metadata"
      ${autoLoop ? 'loop' : ''}
      playsinline
    >
      ${subtitleSrc ? `<track src="${subtitleSrc}" kind="subtitles" srclang="en" label="${escapeHtml(subtitleLabel || 'Subtitles')}" default>` : ''}
    </video>

    <div id="bottom-bar-wrapper">
      <div class="controls-bar">
        <button class="ctrl-btn" id="btn-play" title="Play / Pause (Space)">
          <svg id="play-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <svg id="pause-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:none;">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        </button>

        <button class="ctrl-btn" id="btn-rewind" title="Rewind 10s (Left Arrow / J)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
            <text x="12" y="16" font-size="8.5" font-weight="700" fill="currentColor" stroke="none" text-anchor="middle">10</text>
          </svg>
        </button>

        <button class="ctrl-btn" id="btn-forward" title="Forward 10s (Right Arrow / L)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <text x="12" y="16" font-size="8.5" font-weight="700" fill="currentColor" stroke="none" text-anchor="middle">10</text>
          </svg>
        </button>

        <button class="ctrl-btn ${autoLoop ? 'btn-active-blue' : ''}" id="btn-loop" title="Toggle Auto-Repeat / Loop (R)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="17 1 21 5 17 9"/>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
            <polyline points="7 23 3 19 7 15"/>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
          </svg>
        </button>

        <button class="ab-btn" id="btn-ab-a" title="Set Point A (Current Time)">A</button>
        <button class="ab-btn" id="btn-ab-b" title="Set Point B (Current Time)">B</button>

        <div class="volume-group" id="vol-group">
          <button class="ctrl-btn" id="btn-vol" title="Mute / Unmute (M)">
            <svg id="vol-high-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
            <svg id="vol-mute-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/>
              <line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          </button>
          <div class="volume-slider-wrap">
            <input type="range" class="volume-slider" id="vol-slider" min="0" max="1" step="0.05" value="${defaultVolume}">
          </div>
        </div>

        <div class="seekbar-container" id="seekbar-box">
          <div id="seek-tooltip">0:00</div>
          <div class="seekbar-bg">
            <div class="seekbar-buffer" id="seek-buf"></div>
            <div class="ab-highlight-range" id="ab-highlight" style="display:none;"></div>
            <div class="ab-marker ab-marker-a" id="marker-a" style="display:none;"></div>
            <div class="ab-marker ab-marker-b" id="marker-b" style="display:none;"></div>
            <div class="seekbar-progress" id="seek-prog"></div>
            <div class="seekbar-thumb" id="seek-thumb"></div>
          </div>
        </div>

        <div class="time-display" id="time-display">0:00 / 0:00</div>

        <button class="ctrl-btn" id="btn-cc" title="Toggle Subtitles / Captions">
          <span style="font-size: 11px; font-weight: 700; border: 1.5px solid currentColor; border-radius: 3px; padding: 1px 3px;">CC</span>
        </button>

        <div class="speed-container">
          <button class="speed-btn" id="btn-speed" title="Playback Speed">1.0x</button>
          <div class="speed-menu" id="speed-menu">
            <div class="speed-item" data-speed="0.25">0.25x</div>
            <div class="speed-item" data-speed="0.5">0.5x</div>
            <div class="speed-item" data-speed="0.75">0.75x</div>
            <div class="speed-item active" data-speed="1.0">1.0x (Normal)</div>
            <div class="speed-item" data-speed="1.25">1.25x</div>
            <div class="speed-item" data-speed="1.5">1.5x</div>
            <div class="speed-item" data-speed="1.75">1.75x</div>
            <div class="speed-item" data-speed="2.0">2.0x</div>
          </div>
        </div>

        <button class="ctrl-btn" id="btn-pip" title="Picture in Picture">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <rect x="13" y="11" width="7" height="6" rx="1" fill="currentColor"/>
          </svg>
        </button>

        <button class="ctrl-btn" id="btn-fs" title="Fullscreen (F)">
          <svg id="fs-enter-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
          <svg id="fs-exit-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none;">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Error Overlay (for unsupported codecs like ProRes, HEVC, or corrupted files) -->
    <div id="error-overlay">
      <div class="error-icon">⚠️</div>
      <div class="error-title">Unable to Play Video in VS Code</div>
      <div class="error-desc" id="error-desc-text">
        This video format or codec might not be supported natively by VS Code's built-in Chromium player (e.g., ProRes or certain audio codecs). You can play it seamlessly in your system's default media player (QuickTime, VLC, etc.).
      </div>
      <button class="error-btn" id="btn-error-external">Open with External Player (QuickTime / VLC)</button>
    </div>

    <div id="toast">
      <span id="toast-text">Loop: ON</span>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    const container = document.getElementById('player-container');
    const video = document.getElementById('video');
    const btnPlay = document.getElementById('btn-play');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const btnRewind = document.getElementById('btn-rewind');
    const btnForward = document.getElementById('btn-forward');
    const btnLoop = document.getElementById('btn-loop');
    const btnAbA = document.getElementById('btn-ab-a');
    const btnAbB = document.getElementById('btn-ab-b');
    const markerA = document.getElementById('marker-a');
    const markerB = document.getElementById('marker-b');
    const abHighlight = document.getElementById('ab-highlight');
    const btnVol = document.getElementById('btn-vol');
    const volHighIcon = document.getElementById('vol-high-icon');
    const volMuteIcon = document.getElementById('vol-mute-icon');
    const volSlider = document.getElementById('vol-slider');
    const seekbarBox = document.getElementById('seekbar-box');
    const seekProg = document.getElementById('seek-prog');
    const seekBuf = document.getElementById('seek-buf');
    const seekThumb = document.getElementById('seek-thumb');
    const seekTooltip = document.getElementById('seek-tooltip');
    const timeDisplay = document.getElementById('time-display');
    const btnCc = document.getElementById('btn-cc');
    const btnSpeed = document.getElementById('btn-speed');
    const speedMenu = document.getElementById('speed-menu');
    const btnPip = document.getElementById('btn-pip');
    const btnFs = document.getElementById('btn-fs');
    const fsEnterIcon = document.getElementById('fs-enter-icon');
    const fsExitIcon = document.getElementById('fs-exit-icon');
    const btnExternal = document.getElementById('btn-external');
    const btnReveal = document.getElementById('btn-reveal');
    const errorOverlay = document.getElementById('error-overlay');
    const errorDescText = document.getElementById('error-desc-text');
    const btnErrorExternal = document.getElementById('btn-error-external');
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');
    const centerIndicator = document.getElementById('center-indicator');
    const indicatorIcon = document.getElementById('indicator-icon');
    const resBadge = document.getElementById('res-badge');

    let isLooping = ${autoLoop ? 'true' : 'false'};
    let abPointA = null;
    let abPointB = null;
    let lastVolume = ${defaultVolume};
    let isSeeking = false;
    let hideControlsTimeout = null;

    function showToast(msg) {
      toastText.textContent = msg;
      toast.classList.add('show');
      clearTimeout(toast._t);
      toast._t = setTimeout(() => {
        toast.classList.remove('show');
      }, 1600);
    }

    function formatTime(sec) {
      if (isNaN(sec) || !isFinite(sec)) return "0:00";
      const totalSec = Math.floor(sec);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const sStr = s < 10 ? '0' + s : s;
      if (h > 0) {
        const mStr = m < 10 ? '0' + m : m;
        return \`\${h}:\${mStr}:\${sStr}\`;
      }
      return \`\${m}:\${sStr}\`;
    }

    function updatePlayState(playing) {
      if (playing) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
      } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
      }
    }

    function triggerCenterAnim(iconType) {
      if (iconType === 'play') {
        indicatorIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
      } else {
        indicatorIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
      }
      centerIndicator.classList.remove('animate');
      void centerIndicator.offsetWidth;
      centerIndicator.classList.add('animate');
      setTimeout(() => centerIndicator.classList.remove('animate'), 400);
    }

    function togglePlay() {
      if (video.paused || video.ended) {
        video.play().catch(e => console.log('Autoplay blocked:', e));
        triggerCenterAnim('play');
      } else {
        video.pause();
        triggerCenterAnim('pause');
      }
    }

    function setLoop(state) {
      isLooping = state;
      video.loop = state;
      if (state) {
        btnLoop.classList.add('btn-active-blue');
        showToast('Repeat / Loop: ON');
      } else {
        btnLoop.classList.remove('btn-active-blue');
        showToast('Repeat / Loop: OFF');
      }
      vscode.postMessage({ command: 'saveLoopState', value: state });
    }

    function toggleLoop() {
      setLoop(!isLooping);
    }

    // Safety fallback for instantaneous restart on end
    video.addEventListener('ended', () => {
      if (isLooping) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        updatePlayState(false);
      }
    });

    video.addEventListener('timeupdate', () => {
      if (isSeeking) return;

      const cur = video.currentTime;
      const dur = video.duration || 0;

      if (abPointA !== null && abPointB !== null && abPointB > abPointA) {
        if (cur >= abPointB || cur < abPointA) {
          video.currentTime = abPointA;
          if (video.paused) video.play().catch(() => {});
          return;
        }
      }

      if (dur > 0) {
        const pct = (cur / dur) * 100;
        seekProg.style.width = pct + '%';
        seekThumb.style.left = pct + '%';
      }
      timeDisplay.textContent = \`\${formatTime(cur)} / \${formatTime(dur)}\`;
    });

    video.addEventListener('progress', () => {
      const dur = video.duration || 0;
      if (dur > 0 && video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        seekBuf.style.width = ((bufferedEnd / dur) * 100) + '%';
      }
    });

    video.addEventListener('loadedmetadata', () => {
      const dur = video.duration || 0;
      timeDisplay.textContent = \`\${formatTime(video.currentTime)} / \${formatTime(dur)}\`;

      if (video.videoWidth && video.videoHeight) {
        resBadge.textContent = \`\${video.videoWidth}×\${video.videoHeight}\`;
        resBadge.style.display = 'inline-block';
      }

      video.loop = isLooping;

      ${autoPlay ? `
      video.play().then(() => {
        updatePlayState(true);
      }).catch(err => {
        console.log('Autoplay prevented:', err);
        updatePlayState(false);
      });
      ` : ''}
    });

    video.addEventListener('play', () => updatePlayState(true));
    video.addEventListener('pause', () => updatePlayState(false));

    // Detailed error handling for unsupported codecs (e.g. ProRes MOV)
    video.addEventListener('error', (e) => {
      const err = video.error;
      let reason = 'This video format or codec is not supported by VS Code\\'s built-in browser engine.';
      if (err) {
        if (err.code === 4) {
          reason = 'The video codec (e.g. Apple ProRes, DNxHD, or unsupported HEVC) cannot be decoded by VS Code\\'s browser engine.';
        } else if (err.code === 3) {
          reason = 'A decode error occurred while trying to play this video.';
        } else if (err.code === 2) {
          reason = 'A network/streaming error occurred while reading the file.';
        }
      }
      errorDescText.textContent = reason + ' Please click below to play it seamlessly in your system\\'s default player (QuickTime / VLC).';
      errorOverlay.classList.add('show');
    });

    btnPlay.addEventListener('click', togglePlay);
    video.addEventListener('click', togglePlay);
    video.addEventListener('dblclick', toggleFullscreen);

    btnRewind.addEventListener('click', () => {
      video.currentTime = Math.max(0, video.currentTime - ${skipSeconds});
      showToast('-${skipSeconds}s');
    });

    btnForward.addEventListener('click', () => {
      video.currentTime = Math.min(video.duration || 0, video.currentTime + ${skipSeconds});
      showToast('+${skipSeconds}s');
    });

    btnLoop.addEventListener('click', toggleLoop);

    function updateAbMarkers() {
      const dur = video.duration || 0;
      if (dur <= 0) return;

      if (abPointA !== null) {
        const pctA = (abPointA / dur) * 100;
        markerA.style.left = pctA + '%';
        markerA.style.display = 'block';
        btnAbA.classList.add('active');
      } else {
        markerA.style.display = 'none';
        btnAbA.classList.remove('active');
      }

      if (abPointB !== null) {
        const pctB = (abPointB / dur) * 100;
        markerB.style.left = pctB + '%';
        markerB.style.display = 'block';
        btnAbB.classList.add('active');
      } else {
        markerB.style.display = 'none';
        btnAbB.classList.remove('active');
      }

      if (abPointA !== null && abPointB !== null && abPointB > abPointA) {
        const pctA = (abPointA / dur) * 100;
        const pctB = (abPointB / dur) * 100;
        abHighlight.style.left = pctA + '%';
        abHighlight.style.width = (pctB - pctA) + '%';
        abHighlight.style.display = 'block';
        showToast(\`A-B Loop: \${formatTime(abPointA)} - \${formatTime(abPointB)}\`);
      } else {
        abHighlight.style.display = 'none';
      }
    }

    btnAbA.addEventListener('click', () => {
      if (abPointA !== null && abPointB !== null) {
        abPointA = null;
        abPointB = null;
        updateAbMarkers();
        showToast('A-B Loop Cleared');
        return;
      }
      if (abPointA === null) {
        abPointA = video.currentTime;
        updateAbMarkers();
        showToast(\`Point A set: \${formatTime(abPointA)}\`);
      } else {
        abPointA = null;
        updateAbMarkers();
        showToast('Point A cleared');
      }
    });

    btnAbB.addEventListener('click', () => {
      if (abPointB === null) {
        if (abPointA !== null && video.currentTime <= abPointA) {
          showToast('Point B must be after Point A');
          return;
        }
        abPointB = video.currentTime;
        updateAbMarkers();
        if (abPointA !== null) {
          video.currentTime = abPointA;
          video.play().catch(() => {});
        }
      } else {
        abPointB = null;
        updateAbMarkers();
        showToast('Point B cleared');
      }
    });

    function setVolume(v) {
      video.volume = Math.max(0, Math.min(1, v));
      volSlider.value = video.volume;
      if (video.volume === 0) {
        video.muted = true;
        volHighIcon.style.display = 'none';
        volMuteIcon.style.display = 'block';
      } else {
        video.muted = false;
        volHighIcon.style.display = 'block';
        volMuteIcon.style.display = 'none';
      }
    }

    btnVol.addEventListener('click', () => {
      if (video.muted || video.volume === 0) {
        video.muted = false;
        setVolume(lastVolume > 0 ? lastVolume : 1.0);
        showToast('Unmuted');
      } else {
        lastVolume = video.volume;
        video.muted = true;
        volHighIcon.style.display = 'none';
        volMuteIcon.style.display = 'block';
        showToast('Muted');
      }
    });

    volSlider.addEventListener('input', (e) => {
      lastVolume = parseFloat(e.target.value);
      setVolume(lastVolume);
    });

    function seekToEvent(e) {
      const rect = seekbarBox.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const dur = video.duration || 0;
      video.currentTime = pos * dur;
      seekProg.style.width = (pos * 100) + '%';
      seekThumb.style.left = (pos * 100) + '%';
    }

    seekbarBox.addEventListener('mousedown', (e) => {
      isSeeking = true;
      seekToEvent(e);
      const onMouseMove = (ev) => seekToEvent(ev);
      const onMouseUp = () => {
        isSeeking = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    seekbarBox.addEventListener('mousemove', (e) => {
      const rect = seekbarBox.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const dur = video.duration || 0;
      seekTooltip.textContent = formatTime(pos * dur);
      seekTooltip.style.left = (e.clientX - rect.left) + 'px';
      seekTooltip.style.opacity = '1';
    });

    seekbarBox.addEventListener('mouseleave', () => {
      seekTooltip.style.opacity = '0';
    });

    btnSpeed.addEventListener('click', (e) => {
      e.stopPropagation();
      speedMenu.classList.toggle('show');
    });

    document.querySelectorAll('.speed-item').forEach(item => {
      item.addEventListener('click', () => {
        const spd = parseFloat(item.dataset.speed);
        video.playbackRate = spd;
        btnSpeed.textContent = spd === 1.0 ? '1.0x' : spd + 'x';
        document.querySelectorAll('.speed-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        speedMenu.classList.remove('show');
        showToast(\`Speed: \${spd}x\`);
      });
    });

    window.addEventListener('click', (e) => {
      if (!speedMenu.contains(e.target) && e.target !== btnSpeed) {
        speedMenu.classList.remove('show');
      }
    });

    let ccEnabled = true;
    btnCc.addEventListener('click', () => {
      if (video.textTracks && video.textTracks.length > 0) {
        ccEnabled = !ccEnabled;
        for (let i = 0; i < video.textTracks.length; i++) {
          video.textTracks[i].mode = ccEnabled ? 'showing' : 'hidden';
        }
        btnCc.style.color = ccEnabled ? '#38bdf8' : '#e5e7eb';
        showToast(ccEnabled ? 'Subtitles: ON' : 'Subtitles: OFF');
      } else {
        showToast('No subtitle track found');
      }
    });

    btnPip.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
          await video.requestPictureInPicture();
        }
      } catch (err) {
        console.error('PiP Error:', err);
      }
    });

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }

    btnFs.addEventListener('click', toggleFullscreen);

    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        fsEnterIcon.style.display = 'none';
        fsExitIcon.style.display = 'block';
      } else {
        fsEnterIcon.style.display = 'block';
        fsExitIcon.style.display = 'none';
      }
    });

    btnExternal.addEventListener('click', () => {
      vscode.postMessage({ command: 'openExternal' });
    });
    btnReveal.addEventListener('click', () => {
      vscode.postMessage({ command: 'revealInExplorer' });
    });
    btnErrorExternal.addEventListener('click', () => {
      vscode.postMessage({ command: 'openExternal' });
    });

    function resetHideControlsTimer() {
      container.classList.remove('controls-hidden');
      clearTimeout(hideControlsTimeout);
      if (!video.paused && !video.ended) {
        hideControlsTimeout = setTimeout(() => {
          if (!speedMenu.classList.contains('show')) {
            container.classList.add('controls-hidden');
          }
        }, 2800);
      }
    }

    container.addEventListener('mousemove', resetHideControlsTimer);
    container.addEventListener('mouseenter', resetHideControlsTimer);
    video.addEventListener('play', resetHideControlsTimer);

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'KeyJ':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - ${skipSeconds});
          showToast('-${skipSeconds}s');
          break;
        case 'ArrowRight':
        case 'KeyL':
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 0, video.currentTime + ${skipSeconds});
          showToast('+${skipSeconds}s');
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, video.volume + 0.05));
          showToast(\`Volume: \${Math.round(video.volume * 100)}%\`);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, video.volume - 0.05));
          showToast(\`Volume: \${Math.round(video.volume * 100)}%\`);
          break;
        case 'KeyM':
          btnVol.click();
          break;
        case 'KeyR':
          toggleLoop();
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'KeyA':
          btnAbA.click();
          break;
        case 'KeyB':
          btnAbB.click();
          break;
        case 'Digit0':
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
        case 'Digit5':
        case 'Digit6':
        case 'Digit7':
        case 'Digit8':
        case 'Digit9':
          const pct = parseInt(e.code.replace('Digit', '')) * 10;
          if (video.duration) {
            video.currentTime = (pct / 100) * video.duration;
            showToast(\`Seek: \${pct}%\`);
          }
          break;
      }
      resetHideControlsTimer();
    });

    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      setVolume(Math.max(0, Math.min(1, video.volume + delta)));
      showToast(\`Volume: \${Math.round(video.volume * 100)}%\`);
      resetHideControlsTimer();
    }, { passive: false });

    container.focus();
  </script>
</body>
</html>`;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  activate,
  SimpleVideoPlayerEditorProvider,
  LocalVideoServer
};
