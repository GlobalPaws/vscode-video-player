const assert = require('assert');
const fs = require('fs');
const path = require('path');
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
assert.ok(extCode.includes('asWebviewUri'), 'Must use asWebviewUri for zero-memory HTTP Range streaming');

// Ensure Loop requirement is implemented
assert.ok(extCode.includes('btn-loop'), 'Loop button exists');
assert.ok(extCode.includes('btn-active-blue'), 'Active blue highlight styling exists for loop');
assert.ok(extCode.includes('video.loop'), 'video.loop property toggled');
assert.ok(extCode.includes('video.addEventListener(\'ended\''), 'ended event listener handles auto-restart loop safely');

// Ensure A-B repeat exists
assert.ok(extCode.includes('btn-ab-a') && extCode.includes('btn-ab-b'), 'A-B repeat buttons exist');

// Ensure 10s jump exists
assert.ok(extCode.includes('btn-rewind') && extCode.includes('btn-forward'), '10s rewind/forward buttons exist');

// 4. Test Provider instance and HTML generation
const { SimpleVideoPlayerEditorProvider } = require('../extension');
assert.ok(SimpleVideoPlayerEditorProvider, 'SimpleVideoPlayerEditorProvider exported');

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
  'vscode-webview://test/video.mp4',
  'video/mp4',
  '24.5 GB',
  24500000000,
  true, // autoLoop
  true, // autoPlay
  1.0,
  10,
  null,
  null
);

assert.ok(html.includes('test_video.mp4'), 'HTML includes file title');
assert.ok(html.includes('24.5 GB'), 'HTML includes file size badge');
assert.ok(html.includes('btn-active-blue'), 'Loop button is active by default');
assert.ok(html.includes('<video'), 'HTML includes video tag');
assert.ok(html.includes('loop'), 'Video tag has loop attribute');

// Verify script block inside generated HTML is valid syntax
const scriptStart = html.indexOf('<script>') + 8;
const scriptEnd = html.indexOf('</script>');
assert.ok(scriptStart !== -1 && scriptEnd !== -1, 'Script block found');
const scriptCode = html.substring(scriptStart, scriptEnd);

// Test script syntax by compiling
new Function(scriptCode.replace('acquireVsCodeApi()', '({})'));
console.log('✅ Generated Webview script syntax is valid');

console.log('✅ All verification tests passed successfully!');
