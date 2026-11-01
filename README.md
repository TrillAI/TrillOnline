# Microsoft Windows XP Web OS + Arena AI Agent + Classic Slingo + AOL 9.8 (Gmail Bridge)

A persistent browser-based recreation of **Microsoft Windows XP Professional (SP3)** featuring the authentic boot & passwordless clickable login process, full system sounds, **Arena AI Agent** built natively into the OS (`arena.ai/agent`), fast persistent **Internet Explorer 6**, **Classic AOL Slingo Deluxe**, all 6 original Windows XP games, **Windows Update**, installable `.EXE` software packages, and **America Online 9.0 / 9.8.2 Dial-Up + Gmail Mailbox UI**.

## Highlights

- **Authentic Boot Sequence & Passwordless Clickable Login Screen**:
  - Opens on a pure `#000000` black screen → Award BIOS POST → Microsoft Windows XP scrolling 3-block boot animation → Passwordless **Windows XP Welcome Login Screen** (`Administrator` + Chess avatar — just click your user card to log on!).
  - Pull-down-to-refresh is completely disabled (`overscroll-behavior: none` + touch boundary lock) for a native desktop/touch OS experience.
- **Arena AI Agent Built Into the OS (`Arena AI Agent` + `https://arena.ai/agent` in IE6)**:
  - Run autonomous multi-step coding, file creation, and Windows XP OS control tasks with live tool-call traces (`thinking`, `mkdir`, `write_file`, `generate_image`, `generate_video`, `os_action`, `verify_preview`).
  - **HD Image Generation + Side-by-Side Model Battle**: Saves `.png` images directly into `My Documents\My Pictures\Arena AI` in persistent IndexedDB storage + 1-click **Set as XP Wallpaper**.
  - **Real Playable Video Generation (`.webm`)**: Synthesizes and encodes 30fps `.webm` motion videos directly into `My Documents\My Videos\Arena AI`, playable in **Windows Media Player 9**.
  - **Interactive Web App Builder**: Generates HTML/CSS/JS apps, previews live, opens in IE6 (`vfs://...`), and pins apps as `.EXE` shortcuts right on your XP Desktop!
- **Fast, Persistent Classic Internet Explorer 6**:
  - Authentic IE6 toolbar, waving Windows flag throbber, Address & Links bars, Search Companion, Favorites, History, and persistent multi-tab browsing stored in IndexedDB.
  - Fast parallel live web search + Dual-Engine viewport (**Direct Live Frame** + **⚡ Turbo Web Reader** for anti-`X-Frame-Options` sites) + 1-click **Save Page to My Documents**.
- **Classic AOL Slingo Deluxe + All 6 Original Windows XP Games**:
  - **Slingo Deluxe (Exact Classic AOL Replica)**: 5×5 matrix (`1–75`) + 5 slot reels, 20 spins (paid final spins 17–20 or Free Spin waivers), Jokers, Super Jokers, Multi-Joker Spin Bonuses, Gold Coins, Free Spins, **The Slingo Devil**, **Cherub Arrow Rescue**, 12-line Slingo ladder, spin-scaled Full Card Jackpots (`6,500–15,000` pts), Deluxe Powerups, AOL Slingo Lounge chat, and persistent Hall of Fame!
  - Plus **3D Pinball – Space Cadet (WASM)**, **Minesweeper**, **Solitaire**, **Spider Solitaire**, **FreeCell**, and **Hearts**.
- **Microsoft Windows Update + 5 Official XP Themes**:
  - Express & Custom Windows Update (`wuauclt.exe` & `http://windowsupdate.microsoft.com`), plus **Luna Blue**, **Olive Green**, **Silver**, **Royale (Media Center Glossy)**, and **Zune (Dark Charcoal & Orange)** themes.
- **Full AOL 56K Dial-Up + Gmail Under Old-School AOL 9.8 UI**:
  - 3-panel `Connecting To America Online...` animation, DTMF dialing, 56K modem screech, *"You've got mail!"*, AIM 5.9, and Gmail Mailbox Bridge (Demo + Live Google OAuth 2.0 / Token / IMAP).

## Running Locally

```bash
npm install
npm run dev
```
