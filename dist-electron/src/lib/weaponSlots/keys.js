"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UIOHOOK_MODIFIER_KEYCODES = exports.WHEEL_DOWN_CODE = exports.WHEEL_UP_CODE = exports.KEY_TABLE = exports.MODIFIER_ORDER = void 0;
exports.mouseButtonCode = mouseButtonCode;
exports.isMouseButtonCode = isMouseButtonCode;
exports.mouseButtonIndex = mouseButtonIndex;
exports.isWheelCode = isWheelCode;
exports.lookupKey = lookupKey;
exports.lookupKeyByUiohook = lookupKeyByUiohook;
exports.isKnownCode = isKnownCode;
exports.kindOfCode = kindOfCode;
exports.normalizeModifiers = normalizeModifiers;
exports.makeBinding = makeBinding;
exports.bindingKey = bindingKey;
exports.bindingsEqual = bindingsEqual;
exports.formatBinding = formatBinding;
exports.labelForCode = labelForCode;
exports.toAccelerator = toAccelerator;
exports.toUiohookKeycode = toUiohookKeycode;
exports.lookupModifierCode = lookupModifierCode;
exports.modifiersFromFlags = modifiersFromFlags;
exports.isModifierCode = isModifierCode;
exports.parseLegacyBinding = parseLegacyBinding;
exports.isBareTypingKey = isBareTypingKey;
exports.isSafeBareKey = isSafeBareKey;
/**
 * Canonical key model for Weapon Slot Crosshairs.
 *
 * crshhx identifies inputs by *physical* code (`Digit1`, `KeyQ`, `F5`) rather
 * than by produced character. That keeps a binding stable across QWERTY/AZERTY
 * layouts and lets the same binding be expressed to three different back-ends:
 *
 *   1. the passive `uiohook-napi` hook  -> numeric libuiohook keycode
 *   2. Electron `globalShortcut`        -> accelerator string such as `Alt+1`
 *   3. the DOM recorder in the renderer -> `KeyboardEvent.code` (identity)
 *
 * This module contains no Electron, DOM or React imports.
 */
exports.MODIFIER_ORDER = ['ctrl', 'alt', 'shift', 'meta'];
const LETTER_UIOHOOK = {
    A: 30, B: 48, C: 46, D: 32, E: 18, F: 33, G: 34, H: 35, I: 23, J: 36,
    K: 37, L: 38, M: 50, N: 49, O: 24, P: 25, Q: 16, R: 19, S: 31, T: 20,
    U: 22, V: 47, W: 17, X: 45, Y: 21, Z: 44,
};
const DIGIT_UIOHOOK = {
    '0': 11, '1': 2, '2': 3, '3': 4, '4': 5,
    '5': 6, '6': 7, '7': 8, '8': 9, '9': 10,
};
const NUMPAD_UIOHOOK = {
    '0': 82, '1': 79, '2': 80, '3': 81, '4': 75,
    '5': 76, '6': 77, '7': 71, '8': 72, '9': 73,
};
function buildKeyTable() {
    const table = [];
    for (const digit of Object.keys(DIGIT_UIOHOOK)) {
        table.push({
            code: `Digit${digit}`,
            uiohook: DIGIT_UIOHOOK[digit],
            accelerator: digit,
            label: digit,
            kind: 'key',
            typingCritical: true,
        });
    }
    for (const letter of Object.keys(LETTER_UIOHOOK)) {
        table.push({
            code: `Key${letter}`,
            uiohook: LETTER_UIOHOOK[letter],
            accelerator: letter,
            label: letter,
            kind: 'key',
            typingCritical: true,
        });
    }
    const functionKeys = [
        [1, 59], [2, 60], [3, 61], [4, 62], [5, 63], [6, 64], [7, 65], [8, 66],
        [9, 67], [10, 68], [11, 87], [12, 88], [13, 91], [14, 92], [15, 93],
        [16, 99], [17, 100], [18, 101], [19, 102], [20, 103], [21, 104],
        [22, 105], [23, 106], [24, 107],
    ];
    for (const [n, uiohook] of functionKeys) {
        table.push({
            code: `F${n}`,
            uiohook,
            accelerator: `F${n}`,
            label: `F${n}`,
            kind: 'key',
            // F-keys rarely produce text, so a bare binding is acceptable.
            typingCritical: false,
        });
    }
    for (const digit of Object.keys(NUMPAD_UIOHOOK)) {
        table.push({
            code: `Numpad${digit}`,
            uiohook: NUMPAD_UIOHOOK[digit],
            accelerator: `num${digit}`,
            label: `Num ${digit}`,
            kind: 'key',
            typingCritical: true,
        });
    }
    const numpadOps = [
        ['NumpadAdd', 78, 'numadd', 'Num +'],
        ['NumpadSubtract', 74, 'numsub', 'Num -'],
        ['NumpadMultiply', 55, 'nummult', 'Num *'],
        ['NumpadDivide', 3637, 'numdiv', 'Num /'],
        ['NumpadDecimal', 83, 'numdec', 'Num .'],
        ['NumpadEnter', 3612, 'numenter', 'Num Enter'],
    ];
    for (const [code, uiohook, accelerator, label] of numpadOps) {
        table.push({ code, uiohook, accelerator, label, kind: 'key', typingCritical: true });
    }
    const navigation = [
        ['ArrowUp', 57416, 'Up', '↑'],
        ['ArrowDown', 57424, 'Down', '↓'],
        ['ArrowLeft', 57419, 'Left', '←'],
        ['ArrowRight', 57421, 'Right', '→'],
        ['Home', 3655, 'Home', 'Home'],
        ['End', 3663, 'End', 'End'],
        ['PageUp', 3657, 'PageUp', 'PgUp'],
        ['PageDown', 3665, 'PageDown', 'PgDn'],
        ['Insert', 3666, 'Insert', 'Ins'],
        ['Delete', 3667, 'Delete', 'Del'],
    ];
    for (const [code, uiohook, accelerator, label] of navigation) {
        table.push({ code, uiohook, accelerator, label, kind: 'key', typingCritical: false });
    }
    const punctuation = [
        ['Semicolon', 39, ';', ';'],
        ['Equal', 13, '=', '='],
        ['Comma', 51, ',', ','],
        ['Minus', 12, '-', '-'],
        ['Period', 52, '.', '.'],
        ['Slash', 53, '/', '/'],
        ['Backquote', 41, '`', '`'],
        ['BracketLeft', 26, '[', '['],
        ['BracketRight', 27, ']', ']'],
        ['Backslash', 43, '\\', '\\'],
        ['Quote', 40, "'", "'"],
        ['IntlBackslash', 86, 'IntlBackslash', '<>'],
    ];
    for (const [code, uiohook, accelerator, label] of punctuation) {
        table.push({ code, uiohook, accelerator, label, kind: 'key', typingCritical: true });
    }
    const editing = [
        ['Space', 57, 'Space', 'Space', true],
        ['Tab', 15, 'Tab', 'Tab', true],
        ['Enter', 28, 'Enter', 'Enter', true],
        ['Backspace', 14, 'Backspace', 'Backspace', true],
        ['Escape', 1, 'Esc', 'Esc', false],
        ['CapsLock', 58, 'CapsLock', 'Caps Lock', false],
    ];
    for (const [code, uiohook, accelerator, label, typingCritical] of editing) {
        table.push({ code, uiohook, accelerator, label, kind: 'key', typingCritical });
    }
    return table;
}
exports.KEY_TABLE = buildKeyTable();
const BY_CODE = new Map(exports.KEY_TABLE.map((k) => [k.code, k]));
const BY_UIOHOOK = new Map(exports.KEY_TABLE.map((k) => [k.uiohook, k]));
const BY_ACCELERATOR = new Map(exports.KEY_TABLE.map((k) => [k.accelerator.toLowerCase(), k]));
/**
 * Mouse button codes.
 *
 * libuiohook reports a numeric button index whose meaning differs slightly
 * between Windows/X11/macOS back-ends. Rather than guess a convention (and risk
 * telling the user "Mouse Back" when they pressed the forward button), crshhx
 * stores the raw index and renders it verbatim. The recorder labels the button
 * with whatever number the OS actually reported, so the mapping is always
 * self-describing and cannot be wrong.
 */
function mouseButtonCode(buttonIndex) {
    return `MouseButton${buttonIndex}`;
}
function isMouseButtonCode(code) {
    return /^MouseButton\d+$/.test(code);
}
function mouseButtonIndex(code) {
    const m = /^MouseButton(\d+)$/.exec(code);
    return m ? Number(m[1]) : null;
}
exports.WHEEL_UP_CODE = 'WheelUp';
exports.WHEEL_DOWN_CODE = 'WheelDown';
function isWheelCode(code) {
    return code === exports.WHEEL_UP_CODE || code === exports.WHEEL_DOWN_CODE;
}
function lookupKey(code) {
    return BY_CODE.get(code);
}
function lookupKeyByUiohook(keycode) {
    return BY_UIOHOOK.get(keycode);
}
function isKnownCode(code) {
    return BY_CODE.has(code) || isMouseButtonCode(code) || isWheelCode(code);
}
function kindOfCode(code) {
    if (isMouseButtonCode(code))
        return 'mouse';
    if (isWheelCode(code))
        return 'wheel';
    return 'key';
}
/* ------------------------------------------------------------------ *
 * Binding construction / normalisation
 * ------------------------------------------------------------------ */
function normalizeModifiers(modifiers) {
    const set = new Set();
    for (const m of modifiers) {
        if (exports.MODIFIER_ORDER.includes(m))
            set.add(m);
    }
    return exports.MODIFIER_ORDER.filter((m) => set.has(m));
}
function makeBinding(code, modifiers = []) {
    return {
        code,
        modifiers: normalizeModifiers(modifiers),
        kind: kindOfCode(code),
    };
}
/** Canonical, order-independent identity string used for maps and equality. */
function bindingKey(binding) {
    if (!binding)
        return '';
    return [...binding.modifiers, binding.code].join('+');
}
function bindingsEqual(a, b) {
    if (!a || !b)
        return a === b;
    return bindingKey(a) === bindingKey(b);
}
/** `Alt+Ctrl+1` — stable, human readable, and re-parseable by `parseBinding`. */
function formatBinding(binding) {
    if (!binding)
        return 'Unbound';
    const parts = binding.modifiers.map((m) => MODIFIER_LABEL[m]);
    parts.push(labelForCode(binding.code));
    return parts.join(' + ');
}
const MODIFIER_LABEL = {
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    meta: 'Meta',
};
function labelForCode(code) {
    const def = BY_CODE.get(code);
    if (def)
        return def.label;
    if (code === exports.WHEEL_UP_CODE)
        return 'Wheel Up';
    if (code === exports.WHEEL_DOWN_CODE)
        return 'Wheel Down';
    const idx = mouseButtonIndex(code);
    if (idx !== null)
        return `Mouse ${idx}`;
    return code;
}
/* ------------------------------------------------------------------ *
 * Electron globalShortcut accelerator (fallback transport)
 * ------------------------------------------------------------------ */
const ACCELERATOR_MODIFIER = {
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    meta: 'Super',
};
/**
 * Returns an Electron accelerator string, or `null` when this binding cannot be
 * expressed as one (mouse buttons and wheel events have no accelerator form).
 */
function toAccelerator(binding) {
    if (!binding)
        return null;
    const def = BY_CODE.get(binding.code);
    if (!def)
        return null; // mouse / wheel are not representable
    const parts = binding.modifiers.map((m) => ACCELERATOR_MODIFIER[m]);
    parts.push(def.accelerator);
    return parts.join('+');
}
/* ------------------------------------------------------------------ *
 * uiohook keycode (passive transport)
 * ------------------------------------------------------------------ */
function toUiohookKeycode(binding) {
    if (!binding)
        return null;
    return BY_CODE.get(binding.code)?.uiohook ?? null;
}
exports.UIOHOOK_MODIFIER_KEYCODES = {
    ctrl: 29,
    shift: 42,
    alt: 56,
    meta: 3675,
};
/**
 * libuiohook reports modifier keys as ordinary key-down events. Mapping them to
 * canonical DOM-style codes lets the policy recognise and ignore a bare modifier
 * press without a second lookup table.
 */
const UIOHOOK_MODIFIER_CODE_BY_KEYCODE = {
    29: 'ControlLeft',
    3613: 'ControlRight',
    42: 'ShiftLeft',
    54: 'ShiftRight',
    56: 'AltLeft',
    3640: 'AltRight',
    3675: 'MetaLeft',
    3676: 'MetaRight',
};
function lookupModifierCode(keycode) {
    return UIOHOOK_MODIFIER_CODE_BY_KEYCODE[keycode] ?? null;
}
/** Builds the modifier set from a raw event's modifier flags. */
function modifiersFromFlags(flags) {
    const out = [];
    if (flags.ctrlKey)
        out.push('ctrl');
    if (flags.altKey)
        out.push('alt');
    if (flags.shiftKey)
        out.push('shift');
    if (flags.metaKey)
        out.push('meta');
    return normalizeModifiers(out);
}
function isModifierCode(code) {
    return code === 'ControlLeft' || code === 'ControlRight'
        || code === 'ShiftLeft' || code === 'ShiftRight'
        || code === 'AltLeft' || code === 'AltRight'
        || code === 'MetaLeft' || code === 'MetaRight'
        || code === 'Ctrl' || code === 'Shift' || code === 'Alt' || code === 'Meta';
}
/* ------------------------------------------------------------------ *
 * Legacy string parsing (settings migration)
 * ------------------------------------------------------------------ */
/**
 * Parses the loose accelerator-ish strings older crshhx settings used
 * (`'1'`, `'F10'`, `'num1'`, `'Alt+1'`, `'Ctrl+Alt+Q'`) into a canonical
 * binding. Returns `null` when the string cannot be understood — callers must
 * treat that as "unbound" rather than guessing.
 */
function parseLegacyBinding(raw) {
    if (!raw || typeof raw !== 'string')
        return null;
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
    const tokens = trimmed.split('+').map((t) => t.trim()).filter(Boolean);
    if (tokens.length === 0)
        return null;
    const modifiers = [];
    let keyToken = null;
    for (const token of tokens) {
        const lower = token.toLowerCase();
        if (lower === 'ctrl' || lower === 'control' || lower === 'cmdorctrl') {
            modifiers.push('ctrl');
        }
        else if (lower === 'commandorcontrol') {
            modifiers.push('ctrl');
        }
        else if (lower === 'alt' || lower === 'option') {
            modifiers.push('alt');
        }
        else if (lower === 'shift') {
            modifiers.push('shift');
        }
        else if (lower === 'meta' || lower === 'super' || lower === 'command' || lower === 'cmd' || lower === 'win') {
            modifiers.push('meta');
        }
        else if (keyToken === null) {
            keyToken = token;
        }
        else {
            return null; // more than one non-modifier token — ambiguous
        }
    }
    if (!keyToken)
        return null;
    const def = BY_ACCELERATOR.get(keyToken.toLowerCase()) ?? BY_CODE.get(keyToken);
    if (!def) {
        // Tolerate a bare character such as `q` or `5`.
        if (/^[a-z]$/i.test(keyToken)) {
            const letterDef = BY_CODE.get(`Key${keyToken.toUpperCase()}`);
            if (letterDef)
                return makeBinding(letterDef.code, modifiers);
        }
        if (/^[0-9]$/.test(keyToken)) {
            const digitDef = BY_CODE.get(`Digit${keyToken}`);
            if (digitDef)
                return makeBinding(digitDef.code, modifiers);
        }
        return null;
    }
    return makeBinding(def.code, modifiers);
}
/** True when a binding would be swallowed/consumed by a non-passive transport. */
function isBareTypingKey(binding) {
    if (!binding)
        return false;
    if (binding.modifiers.length > 0)
        return false;
    return BY_CODE.get(binding.code)?.typingCritical === true;
}
/** Keys that are safe to bind bare even on a consuming transport. */
function isSafeBareKey(binding) {
    if (!binding)
        return false;
    if (binding.modifiers.length > 0)
        return true;
    return BY_CODE.get(binding.code)?.typingCritical === false;
}
