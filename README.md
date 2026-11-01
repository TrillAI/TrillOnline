# TrillXP — Interactive Windows XP Time Machine & 2000s PC Museum

**TrillXP** is a full interactive Windows XP Professional (Service Pack 3) Web OS and living museum built for two audiences:
1. **People going back to relive the past** — booting up a Pentium 4 PC, hearing the 56K modem screech and *"You've got mail!"*, spinning the reels in Classic AOL Slingo while dodging the Devil's laugh, dragging cards in Solitaire & Spider Solitaire, or escaping the SkiFree Yeti.
2. **Anyone who missed the early-2000s PC & Internet era** — featuring the built-in **TrillXP 2000s Time Capsule & Educator Museum** with interactive *"Then (2001) vs. Now"* exhibits, an authentic 2000s Soundboard, and hands-on Time-Traveler Quests.

---

## Key Features

### 1. Official Signed Android Package (`TrillXP.apk`) + Fullscreen PWA
- Downloadable directly inside the OS (`Get TrillXP.apk` on Desktop / Start Menu, `apk` in `cmd.exe`, `Get-TrillApk` in PowerShell, or `/downloads/TrillXP.apk`).
- Built deterministically via `scripts/build_trillxp_apk.py` (`npm run build:apk`):
  - **Package Name:** `ai.trill.trillxp` (`v1.0.0`, SDK 21–33)
  - **Cryptographic Signing:** Dual **V1 JAR (`META-INF/CERT.RSA`) + APK Signature Scheme v2 (`0x7109871a`)** RSA-2048 X.509 signature, 4-byte zipaligned (`resources.arsc` & launcher icon stored `ZIP_STORED`).
- Also ships with `manifest.webmanifest` + `sw.js` for 1-tap fullscreen PWA/WebAPK installation.

### 2. Classic AOL Slingo Deluxe Overhaul
- Authentic 1998 AOL / 2002 Funkitron **Slingo Deluxe** royal-blue & brass casino cabinet UI and custom Joker & Gold Coin SVG icon (`/icons/slingo.svg`).
- Real recorded **Devil Laugh** WAVs (`devil-laugh-1.wav`, `devil-laugh-2.wav`), **Winged Cherub Harp** rescue (`cherub-harp.wav`), mechanical slot reel stops, joker chimes, coin clinks, and Slingo fanfares, plus an interactive **Soundboard** modal.
- **3 Game Modes** (*Classic 20-Spin*, *60-Second Blitz*, *Devil's High-Stakes*), **5 Shop Powerups** (*Devil Shield*, *Extra Free Spin*, *2x Next Spin*, *Column Vision*, *Super Wild*), **12 Paytable Ladder Steps**, and **Career Trophies**.

### 3. Authentic Windows XP Card Games (`cards.dll` + Zero-Lag Drag & Tap)
- **Solitaire (`sol.exe`)**, **Spider Solitaire (`spider.exe`)**, and **FreeCell (`freecell.exe`)** rebuilt from scratch with classic `cards.dll` court illustrations, 6 selectable card backs (Castle, Beach, Robot, Roses, Shell, Crosshatch), authentic menu bars & bottom status bars, Vegas/Standard scoring, Undo, and cascading card victory fireworks.
- **Zero-Lag GPU Card Dragging + Tapping:** Smooth 60fps `translate3d` pointer-captured dragging of single cards and multi-card stacks across desktop mouse and mobile touch, **plus** single-click/tap selection and double-click/tap auto-foundation play.

### 4. 12 Built-In Classic PC & XP Games
- **Slingo Deluxe**, **Solitaire**, **Spider Solitaire**, **FreeCell**, **3D Pinball — Space Cadet (WASM)**, **Minesweeper**, **The Microsoft Hearts Network**, **SkiFree** (with the 2000m Abominable Yeti + `F` turbo), **JezzBall XP**, **Mahjong Titans**, **MSN Zone Internet Checkers**, and **Tetris XP**.

### 5. Dual Shells (`powershell.exe` + `cmd.exe`) & XP System Tools
- **Windows PowerShell 1.0 (Monad):** Authentic `#012456` blue console supporting cmdlets (`Get-ChildItem`, `Set-Location`, `Get-Content`, `Set-Content`, `New-Item`, `Remove-Item`, `Get-Process`, `Stop-Process`, `Get-Service`, `Get-ComputerInfo`, `Get-NetIPConfiguration`, `Test-Connection`, `Get-TrillApk`, `Get-TrillPackage`, `Install-TrillPackage`), object pipelines (`| Where-Object`, `| Select-Object`, `| Measure-Object`), `$PSVersionTable`, `$env:*`, history, and Tab completion.
- **Command Prompt (`cmd.exe`):** Full VFS directory navigation (`DIR`, `CD`, `TREE`, `TYPE`, `ECHO >`, `MKDIR`, `DEL`), `SYSTEMINFO`, `TASKLIST`/`TASKKILL`, `IPCONFIG`, `PING`, `NETSTAT`, `COLOR`, `POWERSHELL`, `APK`, and `START`.
- **WordPad (`wordpad.exe`)**, **Registry Editor (`regedit.exe`)**, **About TrillXP (`winver.exe`)**, **Task Manager**, **Control Panel**, **Paint**, **Notepad**, **Calculator**, and **Windows Media Player**.

### 6. Boot Sequence, AOL 9.8 + Gmail, Persistent IE6 & Arena AI Agent
- Pure `#000000` black screen → Award BIOS POST → Windows XP scrolling boot screen → passwordless clickable XP Welcome screen (with pull-down-to-refresh disabled).
- **AOL 9.0 56K Dial-Up + Gmail Mailbox + AIM 5.9**, **Fast Persistent Internet Explorer 6**, **Windows Update**, **.EXE InstallShield Software Center**, and built-in **Arena AI Agent** (`https://arena.ai/agent`) saving generated images, videos, and web apps to IndexedDB persistent VFS storage.

---

## Development & Building

```bash
npm install
npm run dev        # Starts TrillXP on http://0.0.0.0:3000
npm run build:apk  # Rebuilds & signs public/downloads/TrillXP.apk
npm run build      # Runs TypeScript check + production Vite build
npm start          # Runs production Express server + Gmail bridge
```
