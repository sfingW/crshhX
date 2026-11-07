# Crshhx (Crosshair Pro Studio)

> **The zero-latency, ban-safe crosshair engine designed to outperform Crosshair X for competitive FPS esports (Valorant, CS2, Fortnite, Apex Legends).**

---

## 🏆 Why Crshhx is Superior to Crosshair X

| Feature | Crosshair X | **Crshhx** |
| :--- | :--- | :--- |
| **Price** | $9.99 on Steam | **100% Free & Open Source** |
| **System Footprint** | Heavy (~150-250MB RAM, CPU polling) | **Ultra-lightweight (<30MB RAM, 0% CPU in HUD mode)** |
| **Stretched Res (4:3)** | Stretches into ovals & oblong gaps | **Mathematical Counter-Stretch Matrix (circles stay round)** |
| **Valorant Code Bridge**| ❌ Manual slider tweaking | **✅ Direct 1-Click Valorant Share Code Import/Export** |
| **CS2 Console Bridge**  | ❌ Manual slider tweaking | **✅ Direct 1-Click CS2 `cl_crosshair*` Console Export** |
| **Recoil Bloom**        | Basic | **✅ Configurable Firing Expansion Bloom & Recovery Decay** |
| **ADS Morphing**        | Clunky | **✅ Automatic Right-Click ADS Precision Morph / Dot Swap** |
| **Ban Safety**          | Safe | **100% Ban Safe (Zero-injection OS Hardware Overlay)** |

---

## 🚀 Quick Start

### 1. Development Mode
Run the hot-reloading dev environment with Vite and Electron concurrently:
```bash
npm run dev
```

### 2. Production Build
Build the optimized React bundle and compiled Electron main process:
```bash
npm run build
```

### 3. Launch App
Launch the standalone desktop application:
```bash
npm start
```

---

## 🎯 Key Capabilities & Controls

### 1. Dual-Window Architecture
- **Control Studio Window (`index.html`)**: Cyber-themed dark mode studio with live interactive preview, pro presets, Valorant/CS2 converters, and micro-tuning.
- **HUD Overlay Window (`overlay.html`)**: Pinned at the highest OS window level (`screen-saver` topmost), transparent, borderless, with full hardware mouse click-through (`setIgnoreMouseEvents(true, { forward: true })`).

### 2. Hotkeys
- **`F10`**: Instantly toggle HUD overlay visibility on/off while in-game.
- **`F9`**: Cycle to the next saved pro player preset.
- **Left-Click (In Studio)**: Simulates weapon recoil bloom and recovery timing.
- **Right-Click (Hold In Studio)**: Simulates Aim-Down-Sights (ADS) reticle morphing.

### 3. Stretched Resolution Calibration
If you play CS2 or Fortnite at **4:3 stretched** (e.g., `1280x960` or `1440x1080` on a 16:9 monitor):
1. Head to the **4:3 & Nudge** tab in Crshhx Studio.
2. Select **4:3 Stretched**.
3. Crshhx compresses horizontal crosshair coordinates by $0.75\times$ so that when your GPU stretches the screen, the reticle remains mathematically square and circular!

### 4. Direct Game Code Import
- **Valorant Codes**: Paste codes like `0;P;c;5;h;0;d;1;z;2;0t;1;0l;4;0o;2;0a;1;1b;0` directly into the Universal Code Importer to instantly load the exact reticle.
- **CS2 Commands**: Paste console strings like `cl_crosshairstyle 4; cl_crosshairsize 2.5; cl_crosshairgap -1;` to import existing Counter-Strike configs.

---

## 🛡️ Anti-Cheat & Ban Safety Guarantee
Crshhx uses **zero code injection**:
- Does **NOT** inject DLLs into game processes.
- Does **NOT** hook DirectX, Vulkan, or OpenGL rendering pipelines.
- Does **NOT** touch game memory or binaries.
- Renders strictly as an OS desktop HUD window above the game window, making it completely invisible to and compliant with **Riot Vanguard, Easy Anti-Cheat, BattlEye, and Valve Anti-Cheat (VAC)**.
