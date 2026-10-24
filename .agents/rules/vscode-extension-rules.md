# VS Code Webview & Video Player Extension 実装・検証ルール

## 1. 大容量動画ファイル（20GB+）ストリーミングとメモリ保護規則（厳格遵守）
- **`readFile` / `Buffer` / Base64 の使用禁止**:
  - 動画ファイルに対して `fs.readFile`、`vscode.workspace.fs.readFile`、`Buffer.toString('base64')`、または動画バイナリ全体の `postMessage` 送信を行ってはならない。
  - 20GB などの巨大ファイルを開いた際、Node.js プロセスのヒープ上限（約2〜4GB）を瞬時に超過して OOM クラッシュ、あるいは長時間の GC ストップで IDE が完全フリーズする原因となる。
- **`asWebviewUri` によるゼロメモリ Range ストリーミングの徹底**:
  - 動画は必ず `webview.asWebviewUri(document.uri)` を介して `<video src="...">` に渡すこと。
  - Chromium のメディアエンジンがローカル HTTP Range リクエスト経由で再生位置に必要なチャンクのみをオンデマンド取得するため、IDE のメモリを一切消費せず、数十GB以上の動画でも瞬時にシーク・再生できる。
- **リソースアクセス権限の設定**:
  - `webviewPanel.webview.options.localResourceRoots` に対象動画の親ディレクトリ（`vscode.Uri.file(path.dirname(filePath))`）および拡張機能ルート（`context.extensionUri`）を必ず含めること。

---

## 2. package.json のカスタムエディタ定義規則（バイナリ警告回避）
- **`priority: "default"` の指定**:
  - `contributes.customEditors` の対象セレクタ（`*.{mp4,mov,m4v,webm,...}`）では、必ず `"priority": "default"` を設定すること。
  - これにより、ユーザーが動画ファイルをクリックした際に「The file is not displayed in the text editor because it is either binary or uses an unsupported text encoding. Open Anyway」という警告ダイアログが表示されるのを完全に防止し、直接動画プレイヤーを起動する。
- **アクティベーションイベントの記述省略**:
  - VS Code ^1.75.0 以降の仕様に基づき、`commands` や `customEditors` からアクティベーションイベントが自動推論されるため、冗長な `"activationEvents"` は記述しない。

---

## 3. 自動繰り返し（ループ再生）の信頼性保証仕様
- **UI 表示と状態管理**:
  - コントロールバーの繰り返しボタンは、ON のときは青色背景（`.btn-active-blue`）でハイライト表示し、OFF のときは通常スタイルとする。
  - ループ状態は `globalState` に永続化し、次回別の動画を開いた際も前回の設定を引き継ぐこと。
- **再再生の二重保護**:
  - `<video>` の `loop` 属性を設定するだけでなく、`video.addEventListener('ended', ...)` ハンドラー内でも `if (isLooping) { video.currentTime = 0; video.play(); }` を呼び出し、ブラウザの端数誤差や終端処理による停止を防ぎ、シームレスかつ瞬時に先頭から再開させること。

---

## 4. Webview 内スクリプトの安全性と構文規則
- **エスケープ処理**:
  - ファイル名やメタデータなどの外部文字列を HTML やスクリプトに埋め込む際は、必ず `escapeHtml` などのサニタイズ関数を経由すること。
- **CSP (Content Security Policy)**:
  - `media-src ${cspSource} vscode-webview: vscode-resource: blob: data:;` を指定し、安全かつ確実にメディアストリーミングを行えるポリシーを維持すること。
- **防御的 DOM アクセス**:
  - DOM 要素の取得・操作時は `null` チェックを怠らず、予期せぬスクリプト停止を未然に防止すること。

---

## 5. 品質検証ゲート（リリース前チェック）
- コード修正やバージョン更新時は、必ず以下を実行してエラー 0 件であることを確認すること:
  1. `npm run lint`（`node -c extension.js` および `node test/verify.js`）
  2. `npm test`（`node test/verify.js` による動作仕様検証）
  3. `npm run package:vsix`（VSIX パッケージ生成時の警告・エラーなし検証）
