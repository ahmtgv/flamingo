import { describe, expect, it } from 'vitest';

import { decryptUbp, encryptUbp, fromBase64, toBase64, type Ubp } from './ubp';

const sampleUbp: Ubp = {
  baseline: { gazeOnScreen: 0.8 },
  updatedAt: '2026-06-15T00:00:00.000Z',
  sessionsSeen: 3,
};

describe('ubp base64', () => {
  it('round-trips bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255]);
    expect(Array.from(fromBase64(toBase64(bytes)))).toEqual([0, 1, 2, 250, 255]);
  });
});

const hasSubtle = typeof globalThis.crypto?.subtle?.encrypt === 'function';

describe('ubp encryption (client-side; the server only ever sees opaque bytes)', () => {
  it.runIf(hasSubtle)('encrypts then decrypts back to the same UBP', async () => {
    const enc = await encryptUbp(sampleUbp, 'pass-phrase');
    expect(enc.encryptedBlob.length).toBeGreaterThan(0);
    expect(enc.keyHint).toContain('.'); // salt.iv — public params, not the key
    const back = await decryptUbp(enc, 'pass-phrase');
    expect(back).toEqual(sampleUbp);
  });

  it.runIf(hasSubtle)('cannot decrypt with the wrong passphrase', async () => {
    const enc = await encryptUbp(sampleUbp, 'right');
    await expect(decryptUbp(enc, 'wrong')).rejects.toBeTruthy();
  });
});
