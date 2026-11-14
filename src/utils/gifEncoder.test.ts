import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeAnimatedGifBytes } from './gifEncoder';

function makeSolidRgbaFrame(width: number, height: number, r: number, g: number, b: number): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const p = i * 4;
    buf[p] = r;
    buf[p + 1] = g;
    buf[p + 2] = b;
    buf[p + 3] = 255;
  }
  return buf;
}

test('encodeAnimatedGifBytes throws on empty frame list', () => {
  assert.throws(() => encodeAnimatedGifBytes([]), /At least one frame/);
});

test('encodeAnimatedGifBytes produces a valid GIF89a header, Netscape loop block, and trailer', () => {
  const frame1 = { width: 8, height: 8, rgba: makeSolidRgbaFrame(8, 8, 255, 182, 193), delayMs: 300 };
  const frame2 = { width: 8, height: 8, rgba: makeSolidRgbaFrame(8, 8, 196, 181, 253), delayMs: 400 };
  const bytes = encodeAnimatedGifBytes([frame1, frame2]);

  const header = String.fromCharCode(...bytes.slice(0, 6));
  assert.equal(header, 'GIF89a');

  // Logical screen width=8, height=8 (little-endian uint16)
  assert.equal(bytes[6], 8);
  assert.equal(bytes[7], 0);
  assert.equal(bytes[8], 8);
  assert.equal(bytes[9], 0);

  // Trailer byte 0x3b
  assert.equal(bytes[bytes.length - 1], 0x3b);

  // Netscape 2.0 application extension must exist
  const ascii = String.fromCharCode(...bytes.slice(0, 900));
  assert.ok(ascii.includes('NETSCAPE2.0'));

  // Two frames should be larger than single frame
  const singleBytes = encodeAnimatedGifBytes([frame1]);
  assert.ok(bytes.length > singleBytes.length);
});
