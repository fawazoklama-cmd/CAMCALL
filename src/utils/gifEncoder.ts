/**
 * Pure TypeScript GIF89a animated GIF encoder with 6-bit-per-channel uniform 256 palette
 * (6x6x6 color cube = 216 colors + 40 soft grayscale levels) and LZW compression.
 * Runs 100% locally in the browser with zero external dependencies.
 */

export interface GifFrameInput {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  delayMs?: number;
}

function buildUniversalPalette(): Uint8Array {
  const palette = new Uint8Array(256 * 3);
  let idx = 0;
  // 6x6x6 RGB color cube (216 colors)
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        palette[idx * 3] = Math.round((r * 255) / 5);
        palette[idx * 3 + 1] = Math.round((g * 255) / 5);
        palette[idx * 3 + 2] = Math.round((b * 255) / 5);
        idx++;
      }
    }
  }
  // Remaining 40 slots: grayscale ramp
  for (let i = 0; i < 40; i++) {
    const v = Math.round((i * 255) / 39);
    palette[idx * 3] = v;
    palette[idx * 3 + 1] = v;
    palette[idx * 3 + 2] = v;
    idx++;
  }
  return palette;
}

const UNIVERSAL_PALETTE = buildUniversalPalette();

function mapRgbToPaletteIndex(r: number, g: number, b: number): number {
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  // Use grayscale ramp when near neutral for cleaner skin tones & B&W
  if (maxC - minC <= 6) {
    const gray = Math.round((r + g + b) / 3);
    const slot = Math.min(39, Math.max(0, Math.round((gray / 255) * 39)));
    return 216 + slot;
  }
  const ri = Math.min(5, Math.max(0, Math.round((r / 255) * 5)));
  const gi = Math.min(5, Math.max(0, Math.round((g / 255) * 5)));
  const bi = Math.min(5, Math.max(0, Math.round((b / 255) * 5)));
  return ri * 36 + gi * 6 + bi;
}

function quantizeFrameIndices(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const count = width * height;
  const indices = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const p = i * 4;
    const a = rgba[p + 3];
    if (a < 16) {
      indices[i] = 255; // pure white fallback
    } else {
      indices[i] = mapRgbToPaletteIndex(rgba[p], rgba[p + 1], rgba[p + 2]);
    }
  }
  return indices;
}

function lzwEncode(indices: Uint8Array, minCodeSize = 8): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  const outBytes: number[] = [];

  let bitBuffer = 0;
  let bitCount = 0;

  const writeBits = (code: number, size: number) => {
    bitBuffer |= code << bitCount;
    bitCount += size;
    while (bitCount >= 8) {
      outBytes.push(bitBuffer & 0xff);
      bitBuffer >>>= 8;
      bitCount -= 8;
    }
  };

  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  let dict = new Map<number, number>();

  const resetDict = () => {
    dict = new Map<number, number>();
    codeSize = minCodeSize + 1;
    nextCode = eoiCode + 1;
  };

  writeBits(clearCode, codeSize);

  let prefix = indices[0] ?? 0;
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    const found = dict.get(key);
    if (found !== undefined) {
      prefix = found;
    } else {
      writeBits(prefix, codeSize);
      if (nextCode < 4096) {
        dict.set(key, nextCode);
        if (nextCode === 1 << codeSize && codeSize < 12) {
          codeSize++;
        }
        nextCode++;
      } else {
        writeBits(clearCode, codeSize);
        resetDict();
      }
      prefix = k;
    }
  }

  writeBits(prefix, codeSize);
  writeBits(eoiCode, codeSize);
  if (bitCount > 0) {
    outBytes.push(bitBuffer & 0xff);
  }

  // Package into GIF sub-blocks (max 255 bytes each)
  const blocks: number[] = [minCodeSize];
  for (let offset = 0; offset < outBytes.length; offset += 255) {
    const slice = outBytes.slice(offset, offset + 255);
    blocks.push(slice.length, ...slice);
  }
  blocks.push(0); // block terminator
  return new Uint8Array(blocks);
}

export function encodeAnimatedGifBytes(frames: GifFrameInput[], defaultDelayMs = 450): Uint8Array {
  if (frames.length === 0) {
    throw new Error('At least one frame is required to encode GIF');
  }
  const width = frames[0].width;
  const height = frames[0].height;
  const chunks: number[] = [];

  const pushStr = (s: string) => {
    for (let i = 0; i < s.length; i++) chunks.push(s.charCodeAt(i));
  };
  const pushU16 = (v: number) => {
    chunks.push(v & 0xff, (v >> 8) & 0xff);
  };

  // Header
  pushStr('GIF89a');

  // Logical Screen Descriptor
  pushU16(width);
  pushU16(height);
  // Global Color Table Flag (1), Color Res (7), Sort (0), Size of GCT (7 -> 256 colors) = 0xF7
  chunks.push(0xf7, 0x00, 0x00);

  // Global Color Table (256 * 3 bytes)
  for (let i = 0; i < UNIVERSAL_PALETTE.length; i++) {
    chunks.push(UNIVERSAL_PALETTE[i]);
  }

  // Netscape 2.0 Looping Application Extension (infinite loop)
  chunks.push(0x21, 0xff, 0x0b);
  pushStr('NETSCAPE2.0');
  chunks.push(0x03, 0x01, 0x00, 0x00, 0x00);

  for (const frame of frames) {
    const delayCentisec = Math.max(2, Math.round((frame.delayMs ?? defaultDelayMs) / 10));
    // Graphic Control Extension
    chunks.push(0x21, 0xf9, 0x04, 0x04);
    pushU16(delayCentisec);
    chunks.push(0x00, 0x00);

    // Image Descriptor
    chunks.push(0x2c);
    pushU16(0);
    pushU16(0);
    pushU16(width);
    pushU16(height);
    chunks.push(0x00); // No local color table

    // LZW Image Data
    const indices = quantizeFrameIndices(frame.rgba, width, height);
    const lzwBlocks = lzwEncode(indices, 8);
    for (let i = 0; i < lzwBlocks.length; i++) {
      chunks.push(lzwBlocks[i]);
    }
  }

  // GIF Trailer
  chunks.push(0x3b);
  return new Uint8Array(chunks);
}

export function encodeCanvasesToGifBlob(
  canvases: HTMLCanvasElement[],
  delayMs = 450,
  targetMaxDim = 480
): Blob {
  const first = canvases[0];
  if (!first) {
    throw new Error('No canvases provided');
  }
  const scale = Math.min(1, targetMaxDim / Math.max(first.width, first.height));
  const w = Math.max(16, Math.round(first.width * scale));
  const h = Math.max(16, Math.round(first.height * scale));

  const work = document.createElement('canvas');
  work.width = w;
  work.height = h;
  const wctx = work.getContext('2d', { willReadFrequently: true });
  if (!wctx) {
    throw new Error('Could not initialize 2D context for GIF encoding');
  }

  const frames: GifFrameInput[] = canvases.map((c) => {
    wctx.clearRect(0, 0, w, h);
    wctx.fillStyle = '#FFFFFF';
    wctx.fillRect(0, 0, w, h);
    wctx.drawImage(c, 0, 0, w, h);
    const data = wctx.getImageData(0, 0, w, h).data;
    return { width: w, height: h, rgba: data, delayMs };
  });

  const bytes = encodeAnimatedGifBytes(frames, delayMs);
  const bufferCopy = new Uint8Array(bytes.byteLength);
  bufferCopy.set(bytes);
  return new Blob([bufferCopy.buffer], { type: 'image/gif' });
}
