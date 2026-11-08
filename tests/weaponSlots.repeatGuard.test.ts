import { describe, expect, it } from 'vitest';
import { KeyRepeatGuard } from '../src/lib/weaponSlots/switchPolicy';
import { makeBinding } from '../src/lib/weaponSlots/keys';
import { down, event, resetClock, up } from './helpers';

/**
 * Key-repeat suppression.
 *
 * A held key must produce exactly one switch. libuiohook does not flag
 * auto-repeat, so the guard reconstructs it from the down/up pair; wheel events
 * have no up-phase and are debounced by time instead.
 */

const d1 = makeBinding('Digit1');
const d2 = makeBinding('Digit2');

describe('repeat guard: held keys', () => {
  it('lets the first key-down through', () => {
    resetClock();
    const guard = new KeyRepeatGuard();
    expect(guard.shouldSuppress(event(d1, 'down', 1000))).toBe(false);
  });

  it('suppresses every repeat while the key stays down', () => {
    const guard = new KeyRepeatGuard();
    expect(guard.shouldSuppress(event(d1, 'down', 1000))).toBe(false);
    for (let t = 1030; t < 2000; t += 30) {
      expect(guard.shouldSuppress(event(d1, 'down', t))).toBe(true);
    }
  });

  it('produces exactly one trigger for a two-second hold at a 30 ms repeat rate', () => {
    const guard = new KeyRepeatGuard();
    let triggers = 0;
    // A real hold delivers ~66 key-down events and no key-ups until release.
    for (let t = 0; t <= 2000; t += 30) {
      if (!guard.shouldSuppress(event(d1, 'down', t))) triggers += 1;
    }
    guard.shouldSuppress(event(d1, 'up', 2030));
    expect(triggers).toBe(1);
  });

  it('suppresses a held key with no up events at all', () => {
    const guard = new KeyRepeatGuard();
    let triggers = 0;
    for (let t = 0; t <= 1000; t += 25) {
      if (!guard.shouldSuppress(event(d1, 'down', t))) triggers += 1;
    }
    expect(triggers).toBe(1);
    expect(guard.heldCount).toBe(1);
  });

  it('allows the key again after it is released', () => {
    const guard = new KeyRepeatGuard();
    expect(guard.shouldSuppress(event(d1, 'down', 1000))).toBe(false);
    expect(guard.shouldSuppress(event(d1, 'down', 1100))).toBe(true);
    expect(guard.shouldSuppress(event(d1, 'up', 1200))).toBe(true);
    expect(guard.shouldSuppress(event(d1, 'down', 1400))).toBe(false);
    expect(guard.heldCount).toBe(1);
  });

  it('honours an explicit isRepeat flag from the transport', () => {
    const guard = new KeyRepeatGuard();
    expect(guard.shouldSuppress({ ...event(d2, 'down', 1000), isRepeat: true })).toBe(true);
  });

  it('never triggers on a key-up', () => {
    const guard = new KeyRepeatGuard();
    expect(guard.shouldSuppress(event(d1, 'up', 1000))).toBe(true);
    expect(guard.shouldSuppress(event(d1, 'up', 2000))).toBe(true);
  });
});

describe('repeat guard: distinct keys are tracked independently', () => {
  it('lets a second key through while the first is still held', () => {
    const guard = new KeyRepeatGuard();
    expect(guard.shouldSuppress(event(d1, 'down', 1000))).toBe(false);
    expect(guard.shouldSuppress(event(d2, 'down', 1010))).toBe(false);
    expect(guard.heldCount).toBe(2);
  });

  it('releasing one key does not release the other', () => {
    const guard = new KeyRepeatGuard();
    guard.shouldSuppress(event(d1, 'down', 1000));
    guard.shouldSuppress(event(d2, 'down', 1010));
    guard.shouldSuppress(event(d1, 'up', 1020));
    expect(guard.shouldSuppress(event(d2, 'down', 1030))).toBe(true);
    expect(guard.heldCount).toBe(1);
  });

  it('treats a modified press as a different input from the bare key', () => {
    const guard = new KeyRepeatGuard();
    expect(guard.shouldSuppress(event(makeBinding('Digit1'), 'down', 1000))).toBe(false);
    expect(guard.shouldSuppress(event(makeBinding('Digit1', ['alt']), 'down', 1010))).toBe(false);
  });
});

describe('repeat guard: rapid switching', () => {
  it('accepts a fast 1-2-3-4-5 sweep', () => {
    const guard = new KeyRepeatGuard();
    const accepted: string[] = [];
    let t = 1000;
    for (let n = 1; n <= 5; n += 1) {
      const binding = makeBinding(`Digit${n}`);
      if (!guard.shouldSuppress(event(binding, 'down', t))) accepted.push(binding.code);
      t += 5;
      guard.shouldSuppress(event(binding, 'up', t));
      t += 5;
    }
    expect(accepted).toEqual(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5']);
  });

  it('accepts alternating back and forth between two slots', () => {
    const guard = new KeyRepeatGuard();
    let accepted = 0;
    let t = 1000;
    for (let i = 0; i < 20; i += 1) {
      const binding = i % 2 === 0 ? d1 : d2;
      if (!guard.shouldSuppress(event(binding, 'down', t))) accepted += 1;
      t += 50;
      guard.shouldSuppress(event(binding, 'up', t));
      t += 10;
    }
    expect(accepted).toBe(20);
  });

  it('debounces a double tap of the same key inside the debounce window', () => {
    const guard = new KeyRepeatGuard(90, 40);
    expect(guard.shouldSuppress(event(d1, 'down', 1000))).toBe(false);
    guard.shouldSuppress(event(d1, 'up', 1005));
    // Second tap 10 ms later — inside the 40 ms debounce.
    expect(guard.shouldSuppress(event(d1, 'down', 1010))).toBe(true);
    guard.shouldSuppress(event(d1, 'up', 1015));
    // Third tap well outside it.
    expect(guard.shouldSuppress(event(d1, 'down', 1200))).toBe(false);
  });
});

describe('repeat guard: mouse wheel', () => {
  const wheelUp = makeBinding('WheelUp');
  const wheelDown = makeBinding('WheelDown');

  it('accepts the first notch', () => {
    const guard = new KeyRepeatGuard();
    expect(guard.shouldSuppress(event(wheelUp, 'down', 1000))).toBe(false);
  });

  it('collapses one fast flick into a single trigger per debounce window', () => {
    const guard = new KeyRepeatGuard(90);
    let accepted = 0;
    // A fast flick delivers several wheel events within a few milliseconds.
    for (let t = 1000; t <= 1060; t += 10) {
      if (!guard.shouldSuppress(event(wheelUp, 'down', t))) accepted += 1;
    }
    expect(accepted).toBe(1);
  });

  it('accepts successive notches spaced beyond the debounce', () => {
    const guard = new KeyRepeatGuard(90);
    let accepted = 0;
    for (let t = 1000; t <= 2000; t += 100) {
      if (!guard.shouldSuppress(event(wheelUp, 'down', t))) accepted += 1;
    }
    expect(accepted).toBe(11);
  });

  it('tracks up and down scrolling separately', () => {
    const guard = new KeyRepeatGuard(90);
    expect(guard.shouldSuppress(event(wheelUp, 'down', 1000))).toBe(false);
    expect(guard.shouldSuppress(event(wheelDown, 'down', 1010))).toBe(false);
  });

  it('does not need an up-phase to re-arm', () => {
    const guard = new KeyRepeatGuard(50);
    expect(guard.shouldSuppress(event(wheelUp, 'down', 1000))).toBe(false);
    expect(guard.shouldSuppress(event(wheelUp, 'down', 1200))).toBe(false);
  });
});

describe('repeat guard: reset', () => {
  it('clears every held key so a stuck key cannot wedge the feature', () => {
    const guard = new KeyRepeatGuard();
    guard.shouldSuppress(event(d1, 'down', 1000));
    guard.shouldSuppress(event(d2, 'down', 1010));
    expect(guard.heldCount).toBe(2);

    guard.reset();
    expect(guard.heldCount).toBe(0);
    // After a transport restart the same keys work again immediately.
    expect(guard.shouldSuppress(event(d1, 'down', 5000))).toBe(false);
    expect(guard.shouldSuppress(event(d2, 'down', 5010))).toBe(false);
  });

  it('clears the debounce history too', () => {
    const guard = new KeyRepeatGuard(90, 40);
    guard.shouldSuppress(event(d1, 'down', 1000));
    guard.reset();
    expect(guard.shouldSuppress(event(d1, 'down', 1010))).toBe(false);
  });
});

describe('repeat guard: integration with the helper clock', () => {
  it('works with the shared event builders', () => {
    resetClock();
    const guard = new KeyRepeatGuard();
    expect(guard.shouldSuppress(down('Digit1'))).toBe(false);
    expect(guard.shouldSuppress(down('Digit1'))).toBe(true);
    expect(guard.shouldSuppress(up('Digit1'))).toBe(true);
  });
});
