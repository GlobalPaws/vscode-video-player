# Change Log

## [1.0.3] - 2026-10-24

### Fixed
- **エラー時の IDE フリーズ（Close・Terminal 操作不能）の完全解決**:
  - 特殊コーデック（ProRes / 10-bit HEVC 等）でエラーまたはタイムアウト（7秒）が発生した際、即座に動画ストリームを切断・破棄する **キルスイッチ (`video.removeAttribute('src'); video.load()`)** を実装。Chromium メディアデコーダーの暴走による Electron IPC デッドロックを 100% 防止。
  - ローカル HTTP サーバー側でレートリミット（過負荷防止）とソケットタイムアウト・ストリーム自動解放を徹底し、他の動画や IDE の全機能（Terminal, タブ閉じる等）がスムーズに動作し続けるよう保護。

## [1.0.2] - 2026-10-24

### Fixed
- **20GB+ 大容量動画再生時の IDE クラッシュ・フリーズの根本修正**:
  - VS Code の内部 `vscode-webview://` プロトコルにおける 2GB（32-bit offset）上限バグおよび IPC バッファ確保による OOM クラッシュを完全回避するため、**内蔵ローカル HTTP 206 Range ストリーミングサーバー（LocalVideoServer）**を実装。
  - Chromium のネイティブ HTTP スタックと直接 64-bit HTTP Range 通信を行うことで、20GB〜100GB超の巨大動画でもメモリ消費ゼロで即時起動・シーク可能に。

## [1.0.1] - 2026-10-24

### Fixed
- VS Code Marketplace のカテゴリ制限に準拠し、非対応カテゴリ `Media` を削除して `Visualization`, `Other` に修正。

## [1.0.0] - 2026-10-24

### Added
- **Instant Auto-Loop Playback**: 繰り返しボタン（青色ハイライト）をONにすることで、動画終了時に途切れることなく瞬時に頭から自動再再生。状態を永続記憶。
- **Zero-Memory Range Streaming**: 20GB以上の超巨大動画ファイルでも、Node.js のメモリを一切消費せず、VS Code / IDE が固まらない高速 Range ストリーミング設計。
- **Direct Custom Editor Integration**: `priority: "default"` 設定により、バイナリ警告ダイアログ（"The file is not displayed in the text editor..."）を表示させず、動画クリックで即座に直接プレイヤーを開く。
- **Full Video Controls**:
  - 再生 / 一時停止 (Play / Pause)
  - 10秒スキップ (↺10 / ↻10)
  - A-B 区間リピート機能 (A / B ボタン)
  - 音量調整 / ミュートトグル
  - スムーズシークバー (ホバープレビュー付き)
  - 再生時間表示 (`0:00 / 0:10`)
  - 字幕表示 (CC)
  - 再生速度セレクタ (0.25x 〜 2.0x)
  - ピクチャーインピクチャー (PiP)
  - 全画面表示 (Fullscreen)
- **Overlay & Media Info**:
  - タイトル・ファイルサイズ・解像度バッジ表示
  - 外部プレイヤー連携（QuickTime / VLC 等でワンクリック起動）
  - 非操作時のコントロール自動フェードアウト
- **Extensive Format Support**: MP4, MOV, M4V, WebM
