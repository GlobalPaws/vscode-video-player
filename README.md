# Video Player: Smooth & Loop (`simple-video-player`)

<p align="center">
  <img src="icon.png" width="128" height="128" alt="Video Player: Smooth & Loop Icon">
</p>

<p align="center">
  <b>High-performance, zero-memory video player for VS Code. Smoothly plays 20GB+ videos without freezing the IDE, features instant auto-loop replay, A-B repeat, and bypasses the binary warning dialog.</b><br>
  <i>20GB以上の超巨大動画でもIDEが一切固まらず、自動ループ繰り返し再生やA-B区間リピートに対応したVS Code向け高速動画プレイヤー拡張機能</i>
</p>

<p align="center">
  <a href="#english">English</a> •
  <a href="#日本語-japanese">日本語</a> •
  <a href="#简体中文-chinese">简体中文</a> •
  <a href="#한국어-korean">한국어</a> •
  <a href="#tiếng-việt-vietnamese">Tiếng Việt</a> •
  <a href="#deutsch-german">Deutsch</a> •
  <a href="#español-spanish">Español</a> •
  <a href="#français-french">Français</a> •
  <a href="#हिन्दी-hindi">हिन्दी</a> •
  <a href="#italiano-italian">Italiano</a> •
  <a href="#português-portuguese">Português</a> •
  <a href="#русский-russian">Русский</a>
</p>

---

## English

### Overview
**Video Player: Smooth & Loop** is a lightweight, zero-memory media player extension built for Visual Studio Code. It solves the notorious IDE freezing issue when opening massive video files (20GB+) and eliminates the annoying "The file is not displayed in the text editor because it is either binary..." warning, opening your MP4, MOV, M4V, and WebM videos instantly.

### Key Features
- **Zero-Memory HTTP Range Streaming (20GB+ Ready)**: Never loads video files into Node.js heap memory. Streams chunks on-demand via Chromium's native engine without lagging or freezing the IDE.
- **Direct Custom Editor Integration**: Configured with `priority: "default"` to bypass the binary encoding warning and open directly upon clicking.
- **Instant Auto-Loop Replay**: Toggle the highlighted blue repeat button (🔄) to automatically restart playback from the beginning (`0:00`) the moment the video ends. State is persisted across sessions.
- **A-B Interval Repeat**: Set Point A and Point B on the seekbar to loop a specific section seamlessly.
- **Full Player Controls**: Play/pause, 10-second skip buttons (`↺10` / `↻10`), volume slider & mute, hover timestamp seekbar, time display, subtitles (CC), playback speed selection (0.25x – 2.0x), Picture-in-Picture (PiP), and fullscreen.
- **Auto-Hiding Controls**: Overlay headers and control bar smoothly fade out when the mouse is idle during playback.
- **External Player Fallback**: Quick access button to open the video in your system's default player (QuickTime, VLC, etc.) for specialized codecs.
- **Supported Formats**: MP4, MOV, M4V, WebM.

### Keyboard Shortcuts
| Key | Action |
| :--- | :--- |
| **`Space` / `K`** | Play / Pause |
| **`←` / `J`** | Rewind 10 seconds |
| **`→` / `L`** | Forward 10 seconds |
| **`↑` / `↓`** | Adjust volume (±5%) |
| **`Mouse Wheel`** | Adjust volume smoothly |
| **`M`** | Toggle Mute |
| **`R`** | Toggle Auto-Loop / Repeat |
| **`A`** | Set / clear A-B Repeat Point A |
| **`B`** | Set / clear A-B Repeat Point B |
| **`F`** | Toggle Fullscreen |
| **`0` – `9`** | Jump to 0% – 90% of the video |

---

## 日本語 (Japanese)

### 概要
**Video Player: Smooth & Loop** は、Visual Studio Code 向けの超軽量・高性能動画プレイヤー拡張機能です。20GBを超える大容量動画ファイルを開いた際に IDE が完全フリーズする問題を根本から解決し、「The file is not displayed in the text editor because it is either binary...」という煩わしいバイナリ警告ダイアログなしで、MP4, MOV, M4V, WebM 動画を瞬時に直接再生できます。

### 主な特徴
- **Zero-Memory HTTP Range ストリーミング（20GB+対応）**: 動画ファイルを Node.js のヒープメモリに一切読み込みません。Chromium のメディアエンジンが再生位置のチャンクのみをオンデマンド取得するため、IDE のメモリを圧迫せず、20GB〜50GB以上の超巨大ファイルでもフリーズなしで即座に開き、シークも爆速です。
- **バイナリ警告なしで即起動**: `priority: "default"` のカスタムエディタとして登録されているため、ファイルツリーで動画をクリックした瞬間に直接プレイヤーが開きます。
- **自動繰り返し（ループ再生）**: 青色にハイライトされたリピートボタン（🔄）を ON にすると、動画が最後まで到達した瞬間に途切れることなく頭（`0:00`）に戻って自動再再生されます。設定は自動保存され、次回も引き継がれます。
- **A-B 区間リピート**: 再生中に「A」ボタンと「B」ボタンを押すことで、指定した区間のみを連続ループ再生できます。
- **充実のコントロール機能**: 再生/一時停止、10秒戻る/進む（`↺10` / `↻10`）、音量調整・ミュート、ホバー時間プレビュー付きシークバー、時間表示、字幕（CC）、再生速度（0.25x〜2.0x）、ピクチャーインピクチャー（PiP）、全画面表示。
- **コントロール自動フェードアウト**: 動画再生中にマウスが静止すると、タイトルとコントロールバーが自然にフェードアウトします。
- **外部プレイヤー連携**: 特殊なコーデック（ProRes等）の場合でも、「External」ボタンで QuickTime や VLC 等の OS 既定アプリを一発起動できます。
- **対応フォーマット**: MP4, MOV, M4V, WebM。

### ショートカット一覧
| キー | 動作 |
| :--- | :--- |
| **`Space` / `K`** | 再生 / 一時停止 |
| **`←` / `J`** | 10秒戻る |
| **`→` / `L`** | 10秒進む |
| **`↑` / `↓`** | 音量を上げる / 下げる (5%刻み) |
| **`ホイール上下`** | 音量調整 |
| **`M`** | ミュート切り替え |
| **`R`** | 繰り返し（ループ）ON / OFF 切り替え |
| **`A`** | A-Bリピートの A点（開始点）設定 / 解除 |
| **`B`** | A-Bリピートの B点（終了点）設定 / 解除 |
| **`F`** | フルスクリーン表示切り替え |
| **`0` 〜 `9`** | 動画の 0% 〜 90% 位置へジャンプ |

---

## 简体中文 (Chinese)

### 概述
**Video Player: Smooth & Loop** 是一款专为 Visual Studio Code 打造的高性能、零内存占用视频播放器扩展。它彻底解决了打开 20GB 以上超大视频文件导致 IDE 卡死崩溃的问题，并消除了烦人的“文件为二进制因而无法在文本编辑器中显示”的警告，点击即可秒开 MP4、MOV、M4V 与 WebM 视频。

### 主要特性
- **零内存 HTTP Range 流式传输（支持 20GB+ 大文件）**：从不将视频数据载入 Node.js 内存堆，而是由 Chromium 引擎按需拉取数据块，彻底杜绝 IDE 假死，数十 GB 超大视频即开即看、极速拖动快进。
- **无二进制警告直接打开**：采用 `priority: "default"` 自定义编辑器，文件树单击视频直接进入播放界面。
- **即时自动循环播放**：开启高亮蓝色循环按钮（🔄）后，视频播放到末尾将立即无缝跳回开头（`0:00`）重新播放，设置跨会话自动保存。
- **A-B 片段循环**：随时标记 A 点与 B 点，精准无限循环指定精彩片段。
- **全功能控制栏**：播放/暂停、快退/快进 10 秒（`↺10` / `↻10`）、音量与静音、悬停时间预览进度条、时间显示、字幕（CC）、倍速播放（0.25x – 2.0x）、画中画（PiP）、全屏模式。
- **界面自动淡出**：播放过程中鼠标静止约 3 秒后，顶部信息栏与底部控制栏自动淡出。
- **系统播放器一键唤起**：对于不支持的特殊编码，可通过“External”按钮一键呼出 QuickTime、VLC 等本地播放器。
- **支持格式**：MP4、MOV、M4V、WebM。

### 快捷键
| 按键 | 功能 |
| :--- | :--- |
| **`Space` / `K`** | 播放 / 暂停 |
| **`←` / `J`** | 后退 10 秒 |
| **`→` / `L`** | 前进 10 秒 |
| **`↑` / `↓`** | 音量调节（±5%） |
| **`滚轮上下`** | 平滑调节音量 |
| **`M`** | 静音切换 |
| **`R`** | 开启 / 关闭循环播放 |
| **`A`** | 设置 / 清除 A-B 循环 A 点 |
| **`B`** | 设置 / 清除 A-B 循环 B 点 |
| **`F`** | 全屏切换 |
| **`0` – `9`** | 跳转至视频 0% – 90% 位置 |

---

## 한국어 (Korean)

### 개요
**Video Player: Smooth & Loop**는 Visual Studio Code 전용 고성능 초경량 미디어 플레이어 확장 기능입니다. 20GB 이상의 대용량 동영상 파일을 열 때 IDE가 멈추거나 튕기는 문제를 완벽히 해결하며, 바이너리 텍스트 경고창 없이 MP4, MOV, M4V, WebM 영상을 클릭 즉시 재생합니다.

### 주요 기능
- **제로 메모리 HTTP Range 스트리밍 (20GB+ 완벽 지원)**: 동영상 전체를 메모리에 올리지 않고 재생에 필요한 구간만 온디맨드로 스트리밍하여, 20GB 이상의 초대형 영상도 IDE 멈춤 없이 즉각 열리고 탐색됩니다.
- **바이너리 경고 없는 즉각 실행**: `priority: "default"` 커스텀 에디터 등록을 통해 클릭 시 경고 없이 곧바로 플레이어로 열립니다.
- **순간 자동 루프(반복 재생)**: 파란색 반복 재생 버튼(🔄)을 켜면 동영상이 끝나는 즉시 딜레이 없이 처음(`0:00`)부터 자동으로 다시 재생됩니다.
- **A-B 구간 반복**: 특정 구간의 시작점(A)과 끝점(B)을 설정하여 해당 구간만 무한 반복 재생할 수 있습니다.
- **풍부한 컨트롤러**: 재생/일시정지, 10초 건너뛰기(`↺10` / `↻10`), 볼륨 및 음소거, 마우스 오버 타임스탬프 툴팁 시크바, 자막(CC), 재생 속도(0.25x ~ 2.0x), PIP(화면 속 화면), 전체화면.
- **컨트롤 자동 숨김**: 재생 중 마우스 조작이 없으면 상/하단 컨트롤이 부드럽게 사라집니다.
- **외부 플레이어 연동**: 지원되지 않는 특수 코덱은 'External' 버튼으로 QuickTime, VLC 등 기본 플레이어에서 원클릭으로 실행 가능.
- **지원 포맷**: MP4, MOV, M4V, WebM.

### 단축키
| 단축키 | 동작 |
| :--- | :--- |
| **`Space` / `K`** | 재생 / 일시정지 |
| **`←` / `J`** | 10초 뒤로 |
| **`→` / `L`** | 10초 앞으로 |
| **`↑` / `↓`** | 볼륨 조절 (5% 단위) |
| **`마우스 휠`** | 볼륨 조절 |
| **`M`** | 음소거 전환 |
| **`R`** | 반복 재생(루프) 켜기 / 끄기 |
| **`A`** | A-B 반복 A 지점 설정 / 해제 |
| **`B`** | A-B 반복 B 지점 설정 / 해제 |
| **`F`** | 전체화면 전환 |
| **`0` ~ `9`** | 영상의 0% ~ 90% 지점으로 즉시 이동 |

---

## Tiếng Việt (Vietnamese)

### Tổng quan
**Video Player: Smooth & Loop** là tiện ích mở rộng trình phát video hiệu năng cao, không tốn bộ nhớ dành riêng cho Visual Studio Code. Tiện ích này giải quyết triệt để lỗi treo đơ IDE khi mở các tệp video dung lượng khủng (trên 20GB) và loại bỏ cảnh báo tệp nhị phân phiền toái, cho phép bạn phát trực tiếp các video MP4, MOV, M4V và WebM ngay tức thì.

### Tính năng chính
- **Phát trực tiếp HTTP Range không tốn RAM (Hỗ trợ 20GB+)**: Không nạp tệp video vào bộ nhớ Node.js, giúp mở tệp dung lượng hàng chục GB ngay lập tức mà không làm đơ IDE.
- **Mở trực tiếp không cần xác nhận nhị phân**: Thiết lập `priority: "default"` giúp video mở ngay vào trình phát khi nhấp chuột.
- **Tự động lặp lại video tức thì**: Bật nút lặp màu xanh (🔄) để video tự động phát lại từ đầu (`0:00`) ngay khi kết thúc mà không bị ngắt quãng.
- **Lặp đoạn A-B**: Đánh dấu điểm A và B trên thanh tua để lặp lại một đoạn video cụ thể.
- **Bộ điều khiển toàn diện**: Phát/tạm dừng, tua 10 giây (`↺10` / `↻10`), âm lượng & tắt tiếng, xem trước thời gian khi rê chuột, phụ đề (CC), tốc độ phát (0.25x – 2.0x), Hình trong hình (PiP), và toàn màn hình.
- **Tự động ẩn thanh điều khiển**: Ẩn thanh công cụ khi không di chuột để tối ưu không gian xem video.
- **Định dạng hỗ trợ**: MP4, MOV, M4V, WebM.

---

## Deutsch (German)

### Übersicht
**Video Player: Smooth & Loop** ist eine leistungsstarke, speicherfreie Videoplayer-Erweiterung für Visual Studio Code. Sie behebt das Einfrieren der IDE beim Öffnen riesiger Videodateien (20GB+) und umgeht den Warnhinweis auf Binärdateien, sodass MP4-, MOV-, M4V- und WebM-Dateien sofort abgespielt werden können.

### Hauptmerkmale
- **Zero-Memory HTTP Range Streaming (20GB+ fähig)**: Lädt keine Videodaten in den Node.js-Speicher; streamt Chunks bedarfsgerecht ohne die IDE zu blockieren.
- **Direktes Öffnen ohne Warnung**: Öffnet Mediendateien sofort über den benutzerdefinierten Standard-Editor (`priority: "default"`).
- **Sofortige automatische Endlosschleife**: Aktivieren Sie die blaue Wiederholungstaste (🔄), um das Video am Ende nahtlos von vorn neu zu starten.
- **A-B Intervallwiederholung**: Markieren Sie Startpunkt A und Endpunkt B, um einen bestimmten Ausschnitt in einer Schleife abzuspielen.
- **Vollständige Wiedergabesteuerung**: Wiedergabe/Pause, 10s Vor-/Zurückspringen (`↺10` / `↻10`), Lautstärkeregler, Suchleiste mit Zeitanzeige, Untertitel (CC), Geschwindigkeiten von 0.25x bis 2.0x, Bild-in-Bild (PiP) und Vollbild.
- **Unterstützte Formate**: MP4, MOV, M4V, WebM.

---

## Español (Spanish)

### Descripción general
**Video Player: Smooth & Loop** es una extensión de reproductor de video ultraligera y de alto rendimiento para Visual Studio Code. Elimina por completo los bloqueos del IDE al abrir archivos de video gigantescos (más de 20GB) y evita el molesto cuadro de advertencia de archivo binario, reproduciendo videos MP4, MOV, M4V y WebM al instante.

### Características destacadas
- **Streaming HTTP Range con Cero Memoria (Soporta 20GB+)**: No carga el archivo en la memoria de Node.js, permitiendo abrir y desplazarse por videos masivos sin congelar el IDE.
- **Apertura directa sin avisos**: Registrado con `priority: "default"` para abrir directamente con un solo clic.
- **Repetición automática instantánea (Bucle)**: Activa el botón azul de repetición (🔄) para reiniciar el video desde el principio (`0:00`) tan pronto como termine.
- **Repetición de intervalo A-B**: Define puntos de inicio (A) y final (B) para reproducir en bucle un fragmento determinado.
- **Controles completos**: Reproducir/pausar, salto de 10 segundos (`↺10` / `↻10`), volumen y silencio, barra de progreso con vista previa de tiempo, subtítulos (CC), velocidad ajustable (0.25x a 2.0x), Picture-in-Picture (PiP) y pantalla completa.
- **Formatos compatibles**: MP4, MOV, M4V, WebM.

---

## Français (French)

### Vue d'ensemble
**Video Player: Smooth & Loop** est une extension de lecteur multimédia ultra-rapide et sans consommation de mémoire pour Visual Studio Code. Elle résout les problèmes de gel de l'IDE lors de l'ouverture de vidéos volumineuses (+20 Go) et élimine le dialogue d'avertissement de fichier binaire, vous permettant de lire instantanément vos vidéos MP4, MOV, M4V et WebM.

### Fonctionnalités clés
- **Streaming HTTP Range sans surcharge mémoire (+20 Go)**: Ne charge jamais le fichier complet dans la mémoire vive, évitant tout ralentissement ou plantage de l'IDE.
- **Ouverture directe sans avertissement**: S'ouvre immédiatement grâce à la configuration `priority: "default"`.
- **Lecture en boucle automatique instantanée**: Activez le bouton bleu de répétition (🔄) pour rejouer la vidéo depuis le début dès qu'elle se termine.
- **Boucle d'intervalle A-B**: Définissez un point A et un point B pour répéter une section spécifique en continu.
- **Contrôles complets**: Lecture/pause, saut de 10s (`↺10` / `↻10`), volume et sourdine, prévisualisation du temps au survol, sous-titres (CC), vitesse de lecture (0.25x à 2.0x), incrustation d'image (PiP) et plein écran.
- **Formats pris en charge**: MP4, MOV, M4V, WebM.

---

## हिन्दी (Hindi)

### अवलोकन
**Video Player: Smooth & Loop** Visual Studio Code के लिए एक उच्च-प्रदर्शन और मेमोरी-कुशल वीडियो प्लेयर एक्सटेंशन है। यह 20GB से अधिक की विशाल वीडियो फ़ाइलों को खोलने पर IDE के हैंग होने की समस्या को ठीक करता है और बाइनरी चेतावनी को बायपास करके MP4, MOV, M4V, और WebM वीडियो तुरंत चलाता है।

### मुख्य विशेषताएं
- **शून्य-मेमोरी HTTP Range स्ट्रीमिंग (20GB+ समर्थित)**: फ़ाइल को मेमोरी में लोड किए बिना चलाता है, जिससे IDE कभी भी फ्रीज नहीं होता।
- **त्वरित ऑटो-लूप प्लेबैक**: नीले रिपीट बटन (🔄) को चालू करें और वीडियो समाप्त होते ही बिना किसी रुकावट के तुरंत शुरुआत (`0:00`) से दोबारा चलना शुरू हो जाएगा।
- **A-B अंतराल लूप**: किसी विशेष हिस्से को बार-बार चलाने के लिए पॉइंट A और पॉइंट B सेट करें।
- **पूर्ण नियंत्रण**: प्ले/पॉज़, 10-सेकंड स्किप (`↺10` / `↻10`), वॉल्यूम, उपशीर्षक (CC), प्लेबैक गति (0.25x से 2.0x), पिक्चर-इन-पिक्चर (PiP), और फ़ुलस्क्रीन।
- **समर्थित प्रारूप**: MP4, MOV, M4V, WebM।

---

## Italiano (Italian)

### Panoramica
**Video Player: Smooth & Loop** è un'estensione per Visual Studio Code ad alte prestazioni con consumo di memoria pari a zero. Risolve il blocco dell'IDE con video di grandi dimensioni (+20GB) ed elimina il popup di avviso sui file binari, consentendo la riproduzione immediata di video MP4, MOV, M4V e WebM.

### Caratteristiche principali
- **Streaming HTTP Range a memoria zero (+20GB)**: Riproduce video enormi su richiesta senza occupare memoria Node.js o bloccare l'IDE.
- **Apertura diretta**: Impostato su `priority: "default"` per bypassare l'avviso di testo/binario ed entrare subito nel lettore.
- **Loop automatico istantaneo**: Attiva il pulsante blu di ripetizione (🔄) per far ripartire subito il video dall'inizio (`0:00`) non appena termina.
- **Ripetizione intervallo A-B**: Imposta i punti A e B sulla barra temporale per riprodurre in ciclo continuo una sequenza desiderata.
- **Controlli completi**: Play/pausa, salto di 10 secondi (`↺10` / `↻10`), controllo volume, cursore con anteprima del tempo, sottotitoli (CC), velocità regolabile (0.25x – 2.0x), Picture-in-Picture (PiP) e schermo intero.
- **Formati supportati**: MP4, MOV, M4V, WebM.

---

## Português (Portuguese)

### Visão Geral
**Video Player: Smooth & Loop** é uma extensão de reprodutor de vídeo de alto desempenho e consumo zero de memória para o Visual Studio Code. Resolve o congelamento do IDE ao abrir arquivos de vídeo massivos (20GB+) e elimina o alerta de arquivo binário, abrindo seus vídeos MP4, MOV, M4V e WebM instantaneamente.

### Recursos Principais
- **Streaming HTTP Range com Zero Memória (20GB+)**: Não carrega o vídeo na memória do Node.js, transmitindo apenas os dados necessários para evitar qualquer travamento do IDE.
- **Abertura Direta sem Avisos**: Registrado com `priority: "default"` para abrir com um clique no explorador.
- **Repetição Automática Instantânea (Loop)**: Ative o botão azul de repetição (🔄) para reiniciar o vídeo do início (`0:00`) assim que ele terminar.
- **Repetição de Trecho A-B**: Marque os pontos A e B para reproduzir continuamente apenas a parte desejada.
- **Controles Completos**: Reproduzir/pausar, avançar/retroceder 10 segundos (`↺10` / `↻10`), volume e mudo, barra de progresso com prévia de tempo, legendas (CC), velocidade (0.25x a 2.0x), Picture-in-Picture (PiP) e tela cheia.
- **Formatos Suportados**: MP4, MOV, M4V, WebM.

---

## Русский (Russian)

### Обзор
**Video Player: Smooth & Loop** — это высокопроизводительное расширение видеоплеера с нулевым потреблением оперативной памяти для Visual Studio Code. Оно полностью решает проблему зависания IDE при открытии огромных видеофайлов (более 20 ГБ) и исключает всплывающее предупреждение о бинарном файле, мгновенно воспроизводя видео MP4, MOV, M4V и WebM.

### Основные возможности
- **Потоковая передача HTTP Range с нулевым расходом RAM (поддержка 20GB+)**: Не загружает видеофайл целиком в память Node.js, предотвращая любые зависания IDE даже на файлах в десятки гигабайт.
- **Прямое открытие без предупреждений**: Настройка `priority: "default"` мгновенно открывает плеер при клике на файл в проводнике.
- **Мгновенный автоповтор (Loop)**: Включите подсвеченную синюю кнопку повтора (🔄), и видео автоматически перезапустится с начала (`0:00`), как только дойдет до конца.
- **A-B повтор интервала**: Установите точки A и B на шкале воспроизведения для зацикливания нужного фрагмента.
- **Полный набор элементов управления**: Воспроизведение/пауза, перемотка на 10 секунд (`↺10` / `↻10`), громкость и звук, подсказка времени при наведении на таймлайн, субтитры (CC), скорость от 0.25x до 2.0x, Картинка в картинке (PiP) и полноэкранный режим.
- **Поддерживаемые форматы**: MP4, MOV, M4V, WebM.

---

## 📦 How to Install / インストール方法

### VSIX からインストール
1. `simple-video-player-1.0.0.vsix` をビルドまたはダウンロード。
2. VS Code の拡張機能ビュー（Cmd+Shift+X / Ctrl+Shift+X）右上の `...` メニューから **「VSIX からのインストール... (Install from VSIX...)」** を選択。
3. またはターミナルで実行:
   ```bash
   code --install-extension simple-video-player-1.0.0.vsix
   ```

---

## 📄 License

MIT License (c) 2026 GlobalPaws
