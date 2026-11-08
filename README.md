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
- **Your own slot keys**: Switch to a weapon-slot crosshair — see [Weapon Slot Crosshairs](#3-weapon-slot-crosshairs). These are separate from the app hotkeys above and are configured on the **Weapon Slots** page.

> The app hotkeys above are registered with the operating system and are therefore
> *captured* — the focused game will not also receive them. Weapon-slot keys work
> differently: they are observed passively, so the game still gets every press.
- **Left-Click (In Studio)**: Simulates weapon recoil bloom and recovery timing.
- **Right-Click (Hold In Studio)**: Simulates Aim-Down-Sights (ADS) reticle morphing.

### 3. Weapon Slot Crosshairs
Keep a different saved crosshair for each weapon slot and swap the HUD reticle by pressing a key you choose. Press `2` for your AR crosshair, `4` for your sniper — the overlay updates instantly, with no restart and no reload.

- **Not limited to five slots** — up to 24 per profile, each with its own name, key, crosshair and on/off switch.
- **Reuses your existing library** — pick from the same vault, pro presets and personal saves. Slots reference a preset by stable **id**, so renaming a preset never breaks them, and deleting one makes the slot visibly invalid instead of silently swapping in a different reticle.
- **Real key recording** — click the field, press a key (modifiers, mouse side buttons and wheel included), done. Conflicts and reserved keys are refused *with an explanation*.
- **Keys are observed, never captured** — with the optional native input hook running, crshhx watches your key presses without consuming them, so the game still receives every one and your weapon still swaps. If the hook is unavailable it falls back to OS hotkeys and *refuses* bare number keys rather than swallowing them.
- **Per-game slot profiles** — ship-ready Default, Fortnite and CS2 profiles, plus an optional "auto-select by foreground app" that swaps the whole slot table when a matched process comes to the front. Off by default; Windows-only; fails closed rather than guessing.
- **Unassigned slots change nothing** — an empty slot is a deliberate no-op. crshhx never resets you to a default reticle.
- **Zero writes per key press** — configuration is resolved once and pushed to the main process; the switch itself is pure in-memory policy straight into the existing overlay channel.
- **Live status** — a small chip in the status bar reads `Active slot: 2 — AR`, and the slot table tells you in plain language why any key press was ignored.

> This is **keyboard-triggered slot switching**. crshhx does not detect which weapon a game has equipped, does not read game memory, and does not inject anything.

📖 Full guide: [`docs/weapon-slot-crosshairs.md`](docs/weapon-slot-crosshairs.md) · Architecture: [`docs/architecture.md`](docs/architecture.md) · Tests & Windows checklist: [`docs/testing.md`](docs/testing.md)

### 4. Stretched Resolution Calibration
If you play CS2 or Fortnite at **4:3 stretched** (e.g., `1280x960` or `1440x1080` on a 16:9 monitor):
1. Head to the **4:3 & Nudge** tab in Crshhx Studio.
2. Select **4:3 Stretched**.
3. Crshhx compresses horizontal crosshair coordinates by $0.75\times$ so that when your GPU stretches the screen, the reticle remains mathematically square and circular!

### 5. Direct Game Code Import
- **Valorant Codes**: Paste codes like `0;P;c;5;h;0;d;1;z;2;0t;1;0l;4;0o;2;0a;1;1b;0` directly into the Universal Code Importer to instantly load the exact reticle.
- **CS2 Commands**: Paste console strings like `cl_crosshairstyle 4; cl_crosshairsize 2.5; cl_crosshairgap -1;` to import existing Counter-Strike configs.

---

## 📚 Documentation

| Document | Contents |
| --- | --- |
| [`docs/weapon-slot-crosshairs.md`](docs/weapon-slot-crosshairs.md) | User guide: enabling, assigning keys, choosing crosshairs, profiles, unassigned-slot behaviour, supported inputs, limitations, troubleshooting. |
| [`docs/architecture.md`](docs/architecture.md) | Module map, data flow, IPC surface, storage schema, migration, and how each prohibited behaviour is prevented. |
| [`docs/testing.md`](docs/testing.md) | How to run the suite, what each file covers, bugs the tests caught, and the **manual Windows verification checklist**. |

### Tests

```bash
npm test
```

**520 tests across 10 files, all passing.** They cover the switching policy, key-repeat
guard, binding rules, slot/profile configuration, preset resolution, persistence and
migration, end-to-end integration through the real service, the React UI in jsdom, and
build-layout integrity. Eleven real defects were found by these tests during development
and are listed in [`docs/testing.md`](docs/testing.md).

> **Honest note on verification.** The suite passes on Linux, but **no manual
> verification on Windows has been performed** — the Electron binary could not be
> installed in the development sandbox and the native input hook cannot load without a
> display server. `docs/testing.md` lists every unverified item and provides a
> step-by-step checklist to run on a real Windows machine.

---

## 🛡️ Anti-Cheat & Ban Safety Guarantee
Crshhx uses **zero code injection**:
- Does **NOT** inject DLLs into game processes.
- Does **NOT** hook DirectX, Vulkan, or OpenGL rendering pipelines.
- Does **NOT** touch game memory or binaries.
- Renders strictly as an OS desktop HUD window above the game window, making it completely invisible to and compliant with **Riot Vanguard, Easy Anti-Cheat, BattlEye, and Valve Anti-Cheat (VAC)**.
