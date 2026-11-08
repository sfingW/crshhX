"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeaponSlotSwitchService = void 0;
const switchPolicy_1 = require("../../src/lib/weaponSlots/switchPolicy");
const keys_1 = require("../../src/lib/weaponSlots/keys");
const profileMatching_1 = require("../../src/lib/weaponSlots/profileMatching");
const foregroundApp_1 = require("./foregroundApp");
const inputTransport_1 = require("./inputTransport");
const EMPTY_ACTIVE = {
    slotId: null,
    slotName: null,
    slotIndex: null,
    presetId: null,
    profileId: null,
    profileName: null,
    switchedAt: 0,
};
class WeaponSlotSwitchService {
    host;
    options;
    runtime = null;
    transportSelection = null;
    repeatGuard = new switchPolicy_1.KeyRepeatGuard();
    foregroundProvider;
    /** Whether tracking is currently supposed to be running. */
    foregroundTrackingWanted = false;
    recording = false;
    studioFocused = false;
    active = { ...EMPTY_ACTIVE };
    lastIgnore = null;
    started = false;
    disposed = false;
    /** Number of accepted switches — used by tests and the diagnostics panel. */
    switchCount = 0;
    /**
       * @param options.transportFactory  override how the input transport is chosen.
       *        Production uses `startBestTransport`; tests inject a deterministic fake.
       * @param options.foregroundProvider override the foreground-app provider.
       */
    constructor(host, options = {}) {
        this.host = host;
        this.options = options;
        this.foregroundProvider = options.foregroundProvider ?? (0, foregroundApp_1.createForegroundProvider)();
    }
    /* ---------------------------------------------------------------- *
     * Lifecycle
     * ---------------------------------------------------------------- */
    start() {
        if (this.started || this.disposed)
            return;
        this.started = true;
        const factory = this.options.transportFactory ?? inputTransport_1.startBestTransport;
        this.transportSelection = factory((event) => this.handleInput(event));
        if (this.transportSelection.degraded) {
            console.warn(`[crshhx] Weapon Slot Crosshairs is using the fallback transport. ${this.transportSelection.reason ?? ''}`);
        }
    }
    /** Full teardown — must remove every OS hook so nothing outlives the app. */
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        try {
            this.transportSelection?.transport.stop();
        }
        catch (err) {
            console.warn('[crshhx] error stopping input transport:', err);
        }
        try {
            this.foregroundProvider.stop();
        }
        catch (err) {
            console.warn('[crshhx] error stopping foreground tracker:', err);
        }
        this.transportSelection = null;
        this.started = false;
        // We just stopped the tracker, so intent and reality agree again.
        this.foregroundTrackingWanted = false;
    }
    /* ---------------------------------------------------------------- *
     * Configuration pushed from the renderer
     * ---------------------------------------------------------------- */
    applyRuntime(runtime) {
        this.runtime = runtime;
        this.repeatGuard.reset();
        this.syncForegroundTracking();
        this.syncTransportBindings();
        // The active profile may have changed under us.
        const profile = this.currentProfile();
        if (profile && this.active.profileId && this.active.profileId !== profile.id) {
            this.active = { ...EMPTY_ACTIVE };
        }
        this.pushStatus();
    }
    setRecording(recording) {
        if (this.recording === recording)
            return;
        this.recording = recording;
        // A key captured by the recorder must never leave a "held" entry behind.
        if (recording)
            this.repeatGuard.reset();
    }
    setStudioFocused(focused) {
        this.studioFocused = focused;
    }
    /** Lets the renderer restore the indicator after a restart. */
    restoreActiveSlot(info) {
        this.active = { ...EMPTY_ACTIVE, ...info };
        this.pushStatus();
    }
    /* ---------------------------------------------------------------- *
     * Hot path
     * ---------------------------------------------------------------- */
    handleInput(event) {
        if (this.disposed || !this.runtime)
            return;
        if (this.repeatGuard.shouldSuppress(event))
            return;
        if (event.phase !== 'down')
            return;
        const decision = (0, switchPolicy_1.decideSwitch)({
            event,
            state: this.runtime.state,
            presetIndex: this.runtime.presetIndex,
            capabilities: this.transportSelection?.transport.capabilities ?? this.runtime.capabilities,
            environment: {
                overlayRunning: this.host.isOverlayVisible() && !!this.host.getOverlayWindow(),
                isRecordingBinding: this.recording,
                studioFocused: this.studioFocused,
                foregroundProcessName: this.foregroundProvider.current(),
                foregroundTrackingAvailable: this.foregroundProvider.isAvailable(),
            },
            activeSlotId: this.active.slotId,
            activePresetId: this.active.presetId,
        });
        this.applyDecision(decision);
    }
    applyDecision(decision) {
        if (decision.kind === 'ignore') {
            // Only report ignores that carry information the user can act on. A plain
            // "no slot uses this key" happens on every keystroke and must stay silent.
            if (decision.reason !== 'no-matching-slot' && decision.reason !== 'key-repeat') {
                this.lastIgnore = {
                    reason: decision.reason,
                    detail: decision.detail ?? null,
                    at: Date.now(),
                };
                this.pushStatus();
            }
            return;
        }
        // Name the profile the decision came from, not merely the live one, so the
        // indicator can never disagree with what was actually applied.
        const profileName = this.runtime?.state.profiles.find((p) => p.id === decision.profileId)?.name ?? null;
        this.active = {
            slotId: decision.slotId,
            slotName: decision.slotName,
            slotIndex: decision.slotIndex,
            presetId: decision.presetId,
            profileId: decision.profileId,
            profileName,
            switchedAt: Date.now(),
        };
        this.switchCount += 1;
        if (!decision.unchanged) {
            // The existing overlay update pathway: same channel the designer uses.
            // No window is created, shown, hidden or reloaded.
            this.host.sendToOverlay('crosshair-updated', decision.config);
        }
        this.host.sendToStudio('weapon-slot-switched', {
            slotId: decision.slotId,
            slotName: decision.slotName,
            slotIndex: decision.slotIndex,
            presetId: decision.presetId,
            profileId: decision.profileId,
            profileName,
            config: decision.config,
            unchanged: decision.unchanged,
            at: this.active.switchedAt,
        });
        this.lastIgnore = null;
        this.pushStatus();
    }
    /* ---------------------------------------------------------------- *
     * Internals
     * ---------------------------------------------------------------- */
    /**
       * The profile that is live *right now*, honouring foreground auto-selection.
       *
       * This must not simply read `activeProfileId`: when automatic selection is on,
       * the profile actually driving the overlay can be a game profile the user
       * never selected by hand, and the status bar has to name that one.
       */
    currentProfile() {
        const state = this.runtime?.state;
        if (!state)
            return null;
        return (0, profileMatching_1.selectProfile)(state, this.foregroundProvider.current()).profile;
    }
    /**
     * Starts or stops foreground tracking, but only when the *intent* changes.
     *
     * Keying this off `isAvailable()` instead would restart the provider on every
     * `applyRuntime` whenever it is wanted but not currently reporting available —
     * which is exactly the state it sits in after failing to start. The service
     * would then respawn the platform worker on every unrelated settings change.
     */
    syncForegroundTracking() {
        const wanted = !!this.runtime?.state.autoSelectProfileByForegroundApp
            || !!this.runtime?.state.profiles.some((p) => p.restrictToMatchedProcesses);
        if (wanted === this.foregroundTrackingWanted)
            return;
        this.foregroundTrackingWanted = wanted;
        if (wanted)
            this.foregroundProvider.start();
        else
            this.foregroundProvider.stop();
    }
    /**
     * Keeps the fallback transport's registrations in step with the config.
     *
     * Only profiles that can actually become active are registered, and only
     * bindings that survive validation for a *consuming* transport. Registering
     * every profile would swallow keys belonging to games the user is not
     * playing, which is exactly the interference this feature must avoid.
     */
    syncTransportBindings() {
        const transport = this.transportSelection?.transport;
        if (!transport || !this.runtime)
            return;
        if (transport.capabilities.passiveGlobalKeyboard) {
            // The passive hook observes all input; nothing to register.
            transport.setBindings([]);
            return;
        }
        const state = this.runtime.state;
        const candidates = state.autoSelectProfileByForegroundApp
            ? state.profiles
            : state.profiles.filter((p) => p.id === state.activeProfileId || p.isDefault);
        const seen = new Set();
        const bindings = [];
        for (const profile of candidates) {
            for (const slot of profile.slots) {
                const binding = slot.binding;
                if (!binding || !slot.enabled)
                    continue;
                if (!slot.presetId)
                    continue; // unassigned slots never trigger
                if (!this.runtime.presetIndex[slot.presetId])
                    continue; // deleted preset
                if ((0, keys_1.isBareTypingKey)(binding))
                    continue; // would be swallowed system-wide
                if (!(0, keys_1.toAccelerator)(binding))
                    continue; // mouse / wheel have no accelerator
                const key = (0, keys_1.bindingKey)(binding);
                if (seen.has(key))
                    continue;
                seen.add(key);
                bindings.push(binding);
            }
        }
        transport.setBindings(bindings);
    }
    pushStatus() {
        this.host.sendToStudio('weapon-slot-status', this.getStatus());
    }
    getStatus() {
        const transport = this.transportSelection?.transport;
        const state = this.runtime?.state;
        const profile = this.currentProfile();
        return {
            enabled: !!state?.enabled,
            transport: transport?.capabilities ?? {
                name: 'Not started',
                passiveGlobalKeyboard: false,
                worksWhenUnfocused: false,
                mouseButtons: false,
                mouseWheel: false,
            },
            degraded: !!this.transportSelection?.degraded,
            degradeReason: this.transportSelection?.reason ?? null,
            activeProfileId: profile?.id ?? null,
            activeProfileName: profile?.name ?? null,
            activeSlot: { ...this.active },
            foregroundTrackingAvailable: this.foregroundProvider.isAvailable(),
            foregroundProcessName: this.foregroundProvider.current(),
            lastIgnore: this.lastIgnore,
            slotCount: profile?.slots.length ?? 0,
        };
    }
}
exports.WeaponSlotSwitchService = WeaponSlotSwitchService;
