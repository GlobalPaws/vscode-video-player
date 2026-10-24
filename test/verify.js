const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const Module = require('module');

console.log('Running Video Player verification tests...');

// 1. Mock 'vscode' module for Node testing
const origLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'vscode') {
    return {
      window: {
        registerCustomEditorProvider: () => ({ dispose: () => {} }),
        showErrorMessage: () => {}
      },
      commands: {
        registerCommand: () => ({ dispose: () => {} }),
        executeCommand: async () => {}
      },
      workspace: {
        getConfiguration: () => ({
          get: (key, def) => def
        })
      },
      env: {
        openExternal: async () => {}
      },
      Uri: {
        file: (p) => ({ fsPath: p, toString: () => 'file://' + p })
      }
    };
  }
  return origLoad.apply(this, arguments);
};

// 2. Verify package.json
const pkgPath = path.join(__dirname, '..', 'package.json');
assert.ok(fs.existsSync(pkgPath), 'package.json exists');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert.strictEqual(pkg.name, 'simple-video-player');
assert.ok(pkg.contributes.customEditors, 'customEditors is defined');
const editor = pkg.contributes.customEditors[0];
assert.strictEqual(editor.viewType, 'simple-video-player.editor');
assert.strictEqual(editor.priority, 'default', 'Must have priority: default to prevent binary warning popup');

// Verify supported extensions
const selector = editor.selector[0].filenamePattern;
assert.ok(selector.includes('mp4') && selector.includes('mov') && selector.includes('webm') && selector.includes('m4v'), 'Supports mp4, mov, webm, m4v');

// Verify categories match official Marketplace categories
const validCategories = [
  'Programming Languages', 'Snippets', 'Linters', 'Themes', 'Debuggers',
  'Formatters', 'Keymaps', 'SCM Providers', 'Other', 'Extension Packs',
  'Language Packs', 'Data Science', 'Machine Learning', 'Visualization',
  'Notebooks', 'Education', 'Testing'
];
assert.ok(Array.isArray(pkg.categories), 'categories must be an array');
for (const cat of pkg.categories) {
  assert.ok(validCategories.includes(cat), `Category '${cat}' must be a valid VS Code Marketplace category`);
}

// 3. Verify extension.js
const extCode = fs.readFileSync(path.join(__dirname, '..', 'extension.js'), 'utf8');

// Ensure NO memory-hogging readFile / base64 on video files
assert.ok(!extCode.includes('readFile(') && !extCode.includes('readFileSync('), 'Must NOT use readFile on videos to prevent freezing on 20GB+ files');
assert.ok(extCode.includes('LocalVideoServer'), 'Must include LocalVideoServer for HTTP Range streaming');
assert.ok(extCode.includes('206'), 'Must handle HTTP 206 Partial Content');

// Ensure Loop requirement is implemented
assert.ok(extCode.includes('btn-loop'), 'Loop button exists');
assert.ok(extCode.includes('btn-active-blue'), 'Active blue highlight styling exists for loop');
assert.ok(extCode.includes('video.loop'), 'video.loop property toggled');
assert.ok(extCode.includes('video.addEventListener(\'ended\''), 'ended event listener handles auto-restart loop safely');

// 4. Test LocalVideoServer HTTP Range Streaming
const { LocalVideoServer, SimpleVideoPlayerEditorProvider } = require('../extension');
assert.ok(LocalVideoServer, 'LocalVideoServer exported');
assert.ok(SimpleVideoPlayerEditorProvider, 'SimpleVideoPlayerEditorProvider exported');

async function testServer() {
  const server = new LocalVideoServer();
  const port = await server.start();
  assert.ok(port > 0, 'Server listening on valid port');

  // Create a dummy video file for range test
  const tempFile = path.join(__dirname, 'test_sample.mp4');
  const buffer = Buffer.alloc(1024 * 1024, 0x55); // 1MB dummy content
  fs.writeFileSync(tempFile, buffer);

  try {
    const { token, videoUrl, fileSize } = await server.registerFile(tempFile);
    assert.strictEqual(fileSize, 1024 * 1024);
    assert.ok(videoUrl.startsWith('http://127.0.0.1:'), 'videoUrl is local HTTP endpoint');

    // Test HTTP Range Request (bytes=0-1023)
    await new Promise((resolve, reject) => {
      const req = http.request({
        host: '127.0.0.1',
        port,
        path: `/video?token=${token}`,
        method: 'GET',
        headers: {
          'Range': 'bytes=0-1023'
        }
      }, (res) => {
        assert.strictEqual(res.statusCode, 206, 'Returns 206 Partial Content');
        assert.strictEqual(res.headers['content-range'], `bytes 0-1023/${fileSize}`);
        assert.strictEqual(res.headers['accept-ranges'], 'bytes');
        assert.strictEqual(res.headers['content-length'], '1024');

        let dataLen = 0;
        res.on('data', chunk => dataLen += chunk.length);
        res.on('end', () => {
          assert.strictEqual(dataLen, 1024, 'Received exact range bytes');
          resolve();
        });
      });
      req.on('error', reject);
      req.end();
    });

    console.log('✅ LocalVideoServer HTTP 206 Range Streaming verified successfully');
  } finally {
    server.dispose();
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  }
}

testServer().then(() => {
  // 5. Test Provider HTML generation
  const dummyWebview = {
    cspSource: 'vscode-webview:',
    asWebviewUri: (uri) => uri.toString()
  };

  const provider = new SimpleVideoPlayerEditorProvider({
    extensionUri: { toString: () => 'vscode-resource:/ext' },
    globalState: { get: () => true, update: async () => {} }
  });

  const html = provider.getHtmlForWebview(
    dummyWebview,
    'test_video.mp4',
    'http://127.0.0.1:50000/video?token=abc',
    'video/mp4',
    '24.5 GB',
    24500000000,
    true,
    true,
    1.0,
    10,
    null,
    null
  );

  assert.ok(html.includes('http://127.0.0.1:'), 'HTML includes local HTTP stream src');
  assert.ok(html.includes('HTTP 206 Stream'), 'HTML includes HTTP 206 badge');
  assert.ok(html.includes('btn-active-blue'), 'Loop button is active by default');

  const scriptStart = html.indexOf('<script>') + 8;
  const scriptEnd = html.indexOf('</script>');
  assert.ok(scriptStart !== -1 && scriptEnd !== -1, 'Script block found');
  const scriptCode = html.substring(scriptStart, scriptEnd);

  new Function(scriptCode.replace('acquireVsCodeApi()', '({})'));
  console.log('✅ Generated Webview script syntax is valid');

  console.log('✅ All verification tests passed successfully!');
}).catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
