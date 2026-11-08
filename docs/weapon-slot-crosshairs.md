# Weapon Slot Crosshairs

**Weapon Slot Crosshairs** lets you keep a different saved crosshair for each of your
weapon slots and swap the HUD reticle between them by pressing a key you choose.

Press `2` and your assault-rifle crosshair appears. Press `4` and your sniper
crosshair appears. The overlay updates immediately — no restart, no reload, no
second window.

> **What this is not.** crshhx responds to *your key press*. It does **not** detect
> which weapon a game has equipped, and it does **not** read the game in any way.
> There is no automatic weapon recognition and no automatic game detection. If you
> press the wrong key, you get the wrong crosshair — exactly as with any manual bind.

---

## Contents

- [Enabling the feature](#enabling-the-feature)
- [The slot table](#the-slot-table)
- [Assigning an activation key](#assigning-an-activation-key)
- [Choosing a crosshair](#choosing-a-crosshair)
- [Unassigned slots](#unassigned-slots)
- [Deleted presets](#deleted-presets)
- [Conflicts and why a key is refused](#conflicts-and-why-a-key-is-refused)
- [Slot profiles and per-game configurations](#slot-profiles-and-per-game-configurations)
- [The active-slot indicator](#the-active-slot-indicator)
- [Input transports: passive hook vs OS hotkeys](#input-transports-passive-hook-vs-os-hotkeys)
- [Supported inputs](#supported-inputs)
- [Anti-cheat safety](#anti-cheat-safety)
- [Limitations](#limitations)
- [Troubleshooting](#troubleshooting)

---

## Enabling the feature

1. Open the crshhx Studio.
2. In the left sidebar, under **Controls**, click **Weapon Slots**.
3. Turn on the switch in the top-right of the page — **Enable Weapon Slot Crosshairs**.

The feature ships **off** by default, so nothing changes until you opt in. Your
existing overlay, presets, hotkeys and calibration settings are untouched either way.

You do **not** have to enable it before configuring it. While the switch is off the slot
rows are dimmed and the page tells you that no key will change the reticle yet, but every
control still works — so you can set the whole table up first and turn the feature on when
you are happy with it. Nothing is applied until it is on.

The same section is reachable from **Keybinds & ADS → Configure**, which also shows
whether switching is currently live.

> **Note on `F8`.** crshhx's settings contain a `centerLockHotkey` field that defaults
> to `F8`, but nothing in the app currently registers or reacts to it. crshhx therefore
> does **not** reserve `F8` — you are free to bind a weapon slot to it. Only keys the app
> actually registers are reserved, so you are never refused a key for a function that
> does not exist.

The feature is off by default for a reason: the shipped slot bindings are `1`–`5`,
which most games already use to change weapon. With the **passive input hook** running
(see [Input transports](#input-transports-passive-hook-vs-os-hotkeys)) that is harmless —
crshhx only *observes* the key and the game still receives it. Without the hook, crshhx
would have to capture those keys system-wide, so it refuses to and asks you for a
modifier combination instead.

## The slot table

Each row is one slot:

| Column | What it does |
| --- | --- |
| **#** | The slot number shown in the status indicator. A warning triangle here means the row cannot currently switch. |
| **Name** | Free text, up to 48 characters. Rename it to anything — `Shotgun`, `Primary`, `Zoom`. The name is what the indicator displays. |
| **Key** | The activation key. Click the field, then press the key you want. |
| **Crosshair** | The assigned reticle, with a live preview, its stable identifier, and a `clear` link. Click the name to open the crosshair picker. |
| **On** | Per-slot switch. A disabled slot keeps its key and crosshair but ignores presses. |
| **Actions** | Reorder the slot, or remove it. |

Below the table:

- **Add slot** — appends a new slot. There is **no five-slot limit**; a profile holds up
  to **24** slots. The five shipped slots are only a starting point.
- **Restore defaults** — resets *this profile* to the five shipped slots after asking
  for confirmation. Other profiles and all other settings are kept.

The counter in the header (`5/5 ready`) tells you how many slots will actually switch.
Slots that are disabled, unbound, unassigned or invalid are excluded, and invalid ones
are counted separately in red.

## Assigning an activation key

1. Click the key field for the slot. It reads **Press a key…** and pulses.
2. Press the key you want — optionally holding `Ctrl`, `Alt`, `Shift` or `Meta`.
3. Done. The field shows the combination, e.g. `Ctrl + Alt + Q`.

Other things you can do in that field:

- **Escape** cancels without changing anything.
- The **✕** beside the field cancels while recording, or clears the key when not.
- Pressing a modifier **on its own** does nothing — crshhx waits for the real key.

While a key field is recording, **switching is suspended**. That is deliberate: pressing
`1` to bind slot 1 must not also fire slot 1.

Key presses are captured on the whole window in the capture phase and identified by
**physical key code** (`Digit1`, `KeyQ`, `F5`), not by the character produced. A binding
therefore stays correct if you switch keyboard layout, and it cannot be confused by
Shift producing a different symbol.

## Choosing a crosshair

Clicking the crosshair cell opens a picker over **your existing crosshair library** —
the same vault, pro presets and personal saves you see everywhere else in crshhx. You
can search it and filter by group.

Selecting a reticle stores its **stable identifier**, never its name. That means:

- Renaming a preset does not break the slots using it.
- Two presets with the same display name cannot be confused.
- crshhx never creates, copies, edits or overwrites a preset when you switch slots.

Click **clear** to unassign the slot, or **✕** / outside the dialog to close without
changing anything.

## Unassigned slots

**An unassigned slot leaves the currently displayed crosshair exactly as it is.**

Pressing the key for a slot with no crosshair does nothing at all. crshhx will not reset
you to a default reticle, will not fall back to another slot's crosshair, and will not
silently pick something similar. The row says `Unassigned — keeps current crosshair`, and
the header counter excludes it from `ready`.

This is intentional. Mid-match, "no change" is far safer than "surprise change".

## Deleted presets

If you delete a preset that a slot references, the slot becomes **visibly invalid**:

- The crosshair cell turns red and reads `Missing — preset was deleted`.
- The row shows a warning triangle and counts as invalid in the header.
- Pressing the key is ignored, and the HUD keeps whatever it was showing.

crshhx **never** silently reassigns the slot to another crosshair. The stored identifier
is left in place, so if the preset ever comes back the slot recovers by itself. If you
saved a configuration that referenced a deleted preset, the repair is listed on the
Weapon Slots page under *"N settings repaired on load"* — nothing is discarded quietly.

## Conflicts and why a key is refused

Every refusal is explained in words under the key field.

| Message | Meaning |
| --- | --- |
| `No activation key assigned — this slot will never trigger.` | The slot has no key yet. Not an error; just inert. |
| `X is already used by slot N "Name" in this profile.` | Two slots in the **same** profile share a key. Rebind one of them. |
| `X is reserved by crshhx for another function.` | The key is one of crshhx's own **registered** hotkeys — `F10` (overlay toggle) or `F9` (preset cycle), or whatever you have changed them to. Change the app hotkey on the **Keybinds & ADS** page if you want that key for a slot. |
| `X is a plain typing key. Without the passive input hook crshhx would capture it system-wide and stop it reaching the game, so a modifier (Ctrl/Alt) is required.` | You are on the **fallback** transport. Add a modifier, or install the optional native hook so bare keys become safe. |
| `Mouse buttons need the passive input hook, which is not running…` | Mouse bindings require the passive hook. |
| `Mouse wheel needs the passive input hook, which is not running…` | Wheel bindings require the passive hook. |
| `Unknown input "X".` | A hand-edited configuration named an input crshhx does not recognise. |

**Two different profiles may use the same keys.** Only one profile is active at a time,
so `1`–`5` can be reused per game without conflict. That is by design.

Modifiers are matched **non-strictly** by default: the modifiers you declared must be
held, but extra ones are ignored. So a slot bound to `Ctrl + 1` still fires on
`Ctrl + Shift + 1`. Where a press could match more than one slot, an exact-modifier match
wins over a subset match.

## Slot profiles and per-game configurations

A **profile** is a whole slot table. crshhx ships three:

- **Default** — Shotgun `1`, Assault Rifle `2`, SMG `3`, Sniper `4`, Utility `5`.
- **Fortnite** — five slots on `1`–`5`, associated with `fortniteclient-win64-shipping.exe`.
- **CS2** — five slots on `1`–`5`, associated with `cs2.exe`.

The profile bar lets you switch profile, rename one (double-click its tab, or use
**Rename**), add a blank one, add another copy of the Fortnite or CS2 template, duplicate
the current one, or delete one. The **Default** profile cannot be deleted; it is always
the general-purpose configuration.

Creating or duplicating a profile **selects it**, so the table you are looking at is
always the one you just made. A duplicate gets fresh slot ids, so two profiles can never
share a row. Duplicate profile names are refused with an explanation rather than silently
suffixed.

### Associating a profile with a game

Open the game-association editor on the profile bar and enter one or more **process
names**, e.g. `cs2.exe`. Then choose how strictly it applies:

- **Auto-select profile by foreground app** (page-level option, **off by default**) —
  when the named process is in the foreground, that profile becomes the active one.
- **Restrict this profile to matched apps** (per profile) — the profile only switches at
  all when its process is in the foreground.

With auto-select off, you simply pick a profile by hand and it stays picked.

### Important caveats about foreground tracking

- It is **Windows-only**. On other platforms crshhx has no way to ask which app is in
  the foreground, and reports that honestly.
- It uses a small persistent PowerShell worker that polls the foreground window roughly
  every 1.5 seconds. It reads **only** the foreground process name. It does not read game
  memory, enumerate processes broadly, or touch the game in any way.
- It is **opt-in**. Nothing starts polling until you enable it.
- If tracking becomes unavailable (the worker fails five times, or you are not on
  Windows) and a profile is set to *restrict to matched apps*, that profile **fails
  closed**: crshhx stops switching rather than guessing. The reason is shown in the UI.
  Turn off the restriction or pick a profile manually to carry on.
- This is **foreground-window matching**, not game detection. crshhx never inspects what
  is happening inside a game.

## The active-slot indicator

A small chip sits in the crshhx status bar (top bar) and reads, for example:

```
Active slot: 2 — AR
```

It updates the moment a switch happens and gives a brief accent pulse as confirmation.
It reads `Slots off` when the feature is disabled and `No slot active` before your first
switch. Hovering it shows the active profile, the input transport in use, the crosshair
identifier, and the reason the last key press was ignored (if any).

There are no toasts, pop-ups or notifications. The chip survives a Studio reload and
picks up where you left off.

If a key press did nothing, the table footer explains why in plain language —
`Last key did nothing: Slot 3 "SMG" has no valid crosshair, so the HUD was left as it was.`

## Input transports: passive hook vs OS hotkeys

crshhx needs to see your key presses while a game has focus. There are exactly two ways
to do that on Windows, and they behave very differently.

### Passive Input Hook (preferred)

Provided by the optional native dependency [`uiohook-napi`](https://github.com/SnosMe/uiohook-napi),
which wraps [libuiohook](https://github.com/kwhat/libuiohook) and its low-level Windows
keyboard/mouse hook.

- Keys are **observed**, never consumed. Every press still reaches the game, so binding
  plain `1`–`5` does not stop the game changing weapon.
- Supports keyboard, **mouse buttons** and **mouse wheel**.
- crshhx uses this library strictly as a *listener*. It never calls the input-injection
  functions the library also exposes (`keyTap`, `keyToggle`). Nothing is ever
  synthesised, replayed or remapped.
- Install is a plain `npm install`: the package ships prebuilt N-API binaries, so there
  is no compilation and no download at install time.

The transport banner on the Weapon Slots page says `Input: Passive Input Hook` when this
is active.

### OS Hotkeys (automatic fallback)

Electron's built-in `globalShortcut`, which wraps the Windows `RegisterHotKey` API. Used
automatically if the native hook cannot load.

- Works everywhere Electron works, with no extra dependency.
- **It consumes the combination.** A key registered this way is intercepted globally and
  the focused application does **not** receive it. Registering bare `1` would break the
  game's own weapon swap — which is exactly why crshhx refuses bare typing keys on this
  transport and requires a `Ctrl`/`Alt` modifier.
- Cannot express mouse buttons or wheel at all.
- Cannot express a modifier-only combination.

The banner shows `Input: OS Hotkeys (fallback)` in amber, with the reason, and the page
gates mouse and wheel bindings accordingly.

crshhx registers slot keys with **exactly one** transport at a time. Binding them on both
would double-fire every press *and* swallow the key. Slot keys are also registered by
**diff** — crshhx adds and removes individual registrations and never calls
`globalShortcut.unregisterAll()`, so your `F10`/`F9` hotkeys survive.

## Supported inputs

| Input | Status |
| --- | --- |
| **Keyboard** (letters, digits, F-keys, numpad, arrows, punctuation, navigation, modifiers) | ✅ Supported. The required and primary implementation. |
| **Mouse wheel** (up/down) | ✅ Supported **only** with the passive hook. Debounced to 90 ms so one flick cannot switch twice. |
| **Mouse side buttons** (back/forward) and **middle button** | ✅ Supported **only** with the passive hook. Left and right click are deliberately never offered — binding them would change your reticle on every shot or every aim. |
| **Controller / gamepad** | ❌ **Not supported.** See below. |

### Why controllers are not supported

This is a real limitation, not an oversight, and crshhx will not pretend otherwise:

- The browser Gamepad API only exists in a **renderer** process, only reports state while
  that window has **focus**, and only via **polling**. A slot switcher must work while the
  *game* has focus, so the API is unusable for this.
- Games typically take **exclusive** XInput/DirectInput ownership of the controller.
  Reading it from another process is unreliable at best.
- Doing it properly would need a native input driver or a hooking layer — which would
  conflict with crshhx's zero-injection guarantee and with anti-cheat expectations.

Mouse-button numbering differs between Windows, X11 and macOS back-ends. Rather than
guess a convention and risk labelling "back" as "forward", crshhx stores the raw button
index reported by the OS and displays that number, so the label always matches what you
actually pressed.

## Anti-cheat safety

Weapon Slot Crosshairs keeps crshhx's zero-injection guarantee intact:

- ❌ No game memory reading.
- ❌ No process or DLL injection.
- ❌ No modification of game files.
- ❌ No anti-cheat bypass, and no attempt to hide from one.
- ❌ No unauthorised game APIs.
- ❌ **No input manipulation.** crshhx never synthesises, replays, remaps, delays or
  swallows your input to evade detection. It observes; it does not act.

The only OS-level facility used is a standard low-level input *listener*, the same
mechanism used by ordinary keyboard utilities, plus reading the foreground window's
process name (opt-in, Windows only). What crshhx then does is entirely local: change the
pixels of its own overlay window.

## Limitations

Be explicit about what this feature does and does not do.

1. **No automatic weapon recognition.** Switching is 100% key-press driven.
2. **No automatic game detection.** The optional foreground feature matches a *window's
   process name*; it does not identify a game or read anything from it.
3. **Foreground tracking is Windows-only and opt-in.** Elsewhere it reports itself
   unavailable and falls back to the manually selected profile.
4. **Mouse and wheel bindings need the optional native hook.** Without it they are
   refused with an explanation rather than silently accepted.
5. **On the fallback transport, bare typing keys are refused.** This is a safety
   measure: registering them would stop the game receiving those keys.
6. **Controller input is not supported** (see above).
7. **Switching requires the overlay to be visible.** With the HUD hidden, presses are
   ignored and the reason is reported — crshhx does not secretly re-show the overlay.
8. **24 slots per profile maximum.**
9. **Slot switching changes the HUD only.** It never edits the crosshair you are working
   on in the designer, never creates or modifies a preset, and never changes your active
   profile. If you then edit and save in the designer, that save goes to the overlay as
   it always did.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Pressing a slot key does nothing | Look at the footer message `Last key did nothing: …`. It states the exact reason. |
| Banner says `OS Hotkeys (fallback)` | The optional `uiohook-napi` package did not load. Re-run `npm install`. Until then, use `Ctrl`/`Alt` combinations and keyboard-only bindings. |
| `1`–`5` stopped reaching the game | You are on the fallback transport. This is precisely what the modifier requirement prevents — if you see it, a binding was made while the passive hook was available and the hook has since gone away. Rebind with a modifier, or restore the hook. |
| A slot shows `Missing — preset was deleted` | The referenced preset is gone. Pick another crosshair for that slot. Nothing else was affected. |
| A restricted profile stopped switching | Foreground tracking became unavailable, and that profile is set to *restrict to matched apps*, so it fails closed. Disable the restriction or select a profile manually. |
| The indicator says `Slots off` | The master switch on the Weapon Slots page is off. |
| Switching works in the Studio but not in game | Confirm the overlay is visible (`F10`) and that the transport banner reports the passive hook. |
