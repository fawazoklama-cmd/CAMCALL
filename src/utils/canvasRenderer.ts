import type {
  CanvasLayer,
  CollageTemplate,
  CropRect,
  EditorAdjustments,
  ExportOptions,
  FilterConfig,
  PhotoboothAspect,
  PhotoboothFrameCount,
  PhotoboothTemplate,
} from '../types/studio';
import {
  buildCanvasFilterString,
  clamp,
  computeCollageSlotRects,
  computePhotostripLayout,
  resolveFilterWithIntensity,
} from './imageProcessing';

const imageCache = new Map<string, HTMLImageElement>();

export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Draws an image with object-fit: cover inside the target rectangle.
 */
function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const srcRatio = srcW / srcH;
  const dstRatio = dw / dh;

  let sx = 0;
  let sy = 0;
  let sw = srcW;
  let sh = srcH;

  if (srcRatio > dstRatio) {
    sw = srcH * dstRatio;
    sx = (srcW - sw) / 2;
  } else {
    sh = srcW / dstRatio;
    sy = (srcH - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/**
 * Applies pixel-level temperature, pink/lavender tint, fade, sharpness, and film grain.
 */
function applyPixelEffects(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: {
    temperature: number;
    pinkTint: number;
    lavenderTint: number;
    fade: number;
    sharpness: number;
    grain: number;
  }
) {
  const { temperature, pinkTint, lavenderTint, fade, sharpness, grain } = options;
  const needsPixelPass =
    Math.abs(temperature) > 0.5 ||
    pinkTint > 0.005 ||
    lavenderTint > 0.005 ||
    fade > 0.005 ||
    sharpness > 1 ||
    grain > 0.01;

  if (!needsPixelPass) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Optional 3x3 sharpening pass
  if (sharpness > 1) {
    const amount = (sharpness / 100) * 0.85;
    const copy = new Uint8ClampedArray(data);
    const rowStride = width * 4;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          const center = copy[idx + c] * 5;
          const neighbors =
            copy[idx - 4 + c] +
            copy[idx + 4 + c] +
            copy[idx - rowStride + c] +
            copy[idx + rowStride + c];
          const sharpened = center - neighbors;
          data[idx + c] = clamp(copy[idx + c] * (1 - amount) + sharpened * amount, 0, 255);
        }
      }
    }
  }

  const warmShift = (temperature / 100) * 32;
  const pinkR = pinkTint * 36;
  const pinkB = pinkTint * 24;
  const lavR = lavenderTint * 20;
  const lavB = lavenderTint * 40;
  const fadeLift = fade * 42;
  const fadeScale = 1 - fade * 0.14;
  const grainStrength = grain * 42;

  // Deterministic-fast pseudo-random noise
  let seed = 1337;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Fade (lift blacks)
    if (fadeLift > 0.01) {
      r = r * fadeScale + fadeLift;
      g = g * fadeScale + fadeLift;
      b = b * fadeScale + fadeLift;
    }

    // Temperature
    r += warmShift;
    b -= warmShift * 0.9;

    // Pink & Lavender tints
    r += pinkR + lavR;
    b += pinkB + lavB;

    // Grain
    if (grainStrength > 0.5) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const noise = ((seed & 0xff) / 255 - 0.5) * grainStrength;
      r += noise;
      g += noise;
      b += noise;
    }

    data[i] = clamp(r, 0, 255);
    data[i + 1] = clamp(g, 0, 255);
    data[i + 2] = clamp(b, 0, 255);
  }

  ctx.putImageData(imgData, 0, 0);
}

function applyVignetteOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number
) {
  if (amount <= 0.01) return;
  const cx = width / 2;
  const cy = height / 2;
  const outerR = Math.hypot(cx, cy);
  const grad = ctx.createRadialGradient(cx, cy, outerR * 0.35, cx, cy, outerR);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(26, 12, 22, ${clamp(amount * 0.72, 0, 0.85)})`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawCoquetteBow(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  accent: string
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(2, size * 0.05);

  // Left loop
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-size * 0.45, -size * 0.42, -size * 0.68, size * 0.22, 0, size * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right loop
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(size * 0.45, -size * 0.42, size * 0.68, size * 0.22, 0, size * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tails
  ctx.beginPath();
  ctx.moveTo(-size * 0.05, size * 0.04);
  ctx.lineTo(-size * 0.32, size * 0.45);
  ctx.lineTo(-size * 0.12, size * 0.36);
  ctx.lineTo(0, size * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(size * 0.05, size * 0.04);
  ctx.lineTo(size * 0.32, size * 0.45);
  ctx.lineTo(size * 0.12, size * 0.36);
  ctx.lineTo(0, size * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Center knot
  ctx.beginPath();
  ctx.arc(0, size * 0.02, size * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawCanvasLayers(
  ctx: CanvasRenderingContext2D,
  layers: CanvasLayer[],
  canvasWidth: number,
  canvasHeight: number
) {
  for (const layer of layers) {
    ctx.save();
    ctx.globalAlpha = clamp(layer.opacity, 0, 1);

    if (layer.type === 'frame') {
      const border = Math.max(12, Math.round(Math.min(canvasWidth, canvasHeight) * 0.045));
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = border;
      ctx.strokeRect(border / 2, border / 2, canvasWidth - border, canvasHeight - border);

      ctx.strokeStyle = layer.accentColor || '#DB2777';
      ctx.lineWidth = Math.max(2, border * 0.14);
      ctx.strokeRect(border, border, canvasWidth - border * 2, canvasHeight - border * 2);

      if (layer.symbol === 'frame-scallop') {
        ctx.fillStyle = layer.accentColor || '#EC4899';
        const step = 28;
        for (let x = border; x < canvasWidth - border; x += step) {
          ctx.beginPath();
          ctx.arc(x, border, 5, 0, Math.PI * 2);
          ctx.arc(x, canvasHeight - border, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      continue;
    }

    const cx = layer.x * canvasWidth;
    const cy = layer.y * canvasHeight;
    ctx.translate(cx, cy);
    ctx.rotate((layer.rotation * Math.PI) / 180);

    const baseSize = Math.min(canvasWidth, canvasHeight) * 0.11 * layer.scale;

    if (layer.type === 'text') {
      const fontSize = Math.max(16, Math.round(baseSize * 0.56));
      const fontFamily = layer.fontFamily || 'Plus Jakarta Sans';
      ctx.font = `700 ${fontSize}px "${fontFamily}", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const content = layer.text || layer.label || 'CAMCALL';

      if (layer.bgColor) {
        const metrics = ctx.measureText(content);
        const padX = fontSize * 0.55;
        const padY = fontSize * 0.35;
        const boxW = metrics.width + padX * 2;
        const boxH = fontSize + padY * 2;
        ctx.fillStyle = layer.bgColor;
        drawRoundedRectPath(ctx, -boxW / 2, -boxH / 2, boxW, boxH, boxH / 2);
        ctx.fill();
      }

      ctx.fillStyle = layer.color;
      ctx.fillText(content, 0, 0);
    } else if (layer.symbol === 'bow-vector') {
      drawCoquetteBow(ctx, baseSize, layer.color, layer.accentColor || '#BE185D');
    } else {
      ctx.font = `${Math.round(baseSize)}px "Plus Jakarta Sans", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = layer.color;
      ctx.fillText(layer.symbol || '♥', 0, 0);
    }

    ctx.restore();
  }
}

export interface RenderEditedPhotoParams {
  image: HTMLImageElement;
  adjustments: EditorAdjustments;
  filter: FilterConfig | null;
  filterIntensity: number;
  crop: CropRect;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  layers: CanvasLayer[];
  maxDimension?: number;
}

export function renderEditedPhotoToCanvas(
  canvas: HTMLCanvasElement,
  params: RenderEditedPhotoParams
): { width: number; height: number } {
  const {
    image,
    adjustments,
    filter,
    filterIntensity,
    crop,
    rotation,
    flipH,
    flipV,
    layers,
    maxDimension = 1800,
  } = params;

  const srcW = image.naturalWidth || image.width;
  const srcH = image.naturalHeight || image.height;

  const sx = Math.round(crop.x * srcW);
  const sy = Math.round(crop.y * srcH);
  const sw = Math.max(1, Math.round(crop.width * srcW));
  const sh = Math.max(1, Math.round(crop.height * srcH));

  const isRotatedOdd = ((rotation % 180) + 180) % 180 === 90;
  let outW = isRotatedOdd ? sh : sw;
  let outH = isRotatedOdd ? sw : sh;

  if (Math.max(outW, outH) > maxDimension) {
    const scale = maxDimension / Math.max(outW, outH);
    outW = Math.max(1, Math.round(outW * scale));
    outH = Math.max(1, Math.round(outH * scale));
  }

  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { width: outW, height: outH };

  ctx.clearRect(0, 0, outW, outH);

  // Draw base cropped + transformed image with CSS canvas filter
  ctx.save();
  ctx.filter = buildCanvasFilterString(adjustments, filter, filterIntensity);
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

  const drawW = isRotatedOdd ? outH : outW;
  const drawH = isRotatedOdd ? outW : outH;
  ctx.drawImage(image, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  const resolved = resolveFilterWithIntensity(filter, filterIntensity);

  // Pixel manipulation pass
  applyPixelEffects(ctx, outW, outH, {
    temperature: clamp(adjustments.temperature + resolved.temperature, -100, 100),
    pinkTint: resolved.pinkTint,
    lavenderTint: resolved.lavenderTint,
    fade: resolved.fade,
    sharpness: adjustments.sharpness,
    grain: clamp(adjustments.grain / 100 + resolved.grain, 0, 1),
  });

  // Vignette
  applyVignetteOverlay(
    ctx,
    outW,
    outH,
    clamp(adjustments.vignette / 100 + resolved.vignette, 0, 1)
  );

  // Stickers, frames, and text layers
  drawCanvasLayers(ctx, layers, outW, outH);

  return { width: outW, height: outH };
}

export async function renderFilterPreviewToCanvas(
  canvas: HTMLCanvasElement,
  imageSrc: string,
  filter: FilterConfig | null,
  intensity = 100,
  maxDimension = 640
) {
  const img = await loadHtmlImage(imageSrc);
  renderEditedPhotoToCanvas(canvas, {
    image: img,
    adjustments: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      exposure: 0,
      temperature: 0,
      sharpness: 0,
      blur: 0,
      grain: 0,
      vignette: 0,
    },
    filter,
    filterIntensity: intensity,
    crop: { x: 0, y: 0, width: 1, height: 1 },
    rotation: 0,
    flipH: false,
    flipV: false,
    layers: [],
    maxDimension,
  });
}

export async function renderPhotostripToCanvas(
  canvas: HTMLCanvasElement,
  options: {
    frames: (string | null)[];
    frameCount: PhotoboothFrameCount;
    aspect: PhotoboothAspect;
    template: PhotoboothTemplate;
    filter: FilterConfig | null;
    caption?: string;
    showDate?: boolean;
    twoColumn?: boolean;
  }
) {
  const {
    frames,
    frameCount,
    aspect,
    template,
    filter,
    caption = '',
    showDate = true,
    twoColumn = false,
  } = options;

  const layout = computePhotostripLayout(frameCount, aspect, twoColumn);
  canvas.width = layout.canvasWidth;
  canvas.height = layout.canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Strip background
  ctx.fillStyle = template.backgroundColor;
  ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight);

  // Subtle decorative template accents
  if (template.motif === 'film') {
    ctx.fillStyle = '#FDF2F8';
    for (let y = 26; y < layout.canvasHeight - 20; y += 36) {
      drawRoundedRectPath(ctx, 12, y, 16, 20, 3);
      ctx.fill();
      drawRoundedRectPath(ctx, layout.canvasWidth - 28, y, 16, 20, 3);
      ctx.fill();
    }
  } else if (template.motif === 'y2k') {
    const grad = ctx.createLinearGradient(0, 0, layout.canvasWidth, layout.canvasHeight);
    grad.addColorStop(0, '#EDE9FE');
    grad.addColorStop(0.5, '#FCE7F3');
    grad.addColorStop(1, '#E0E7FF');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight);
  } else if (template.motif === 'hearts') {
    ctx.fillStyle = template.accentColor;
    ctx.globalAlpha = 0.22;
    ctx.font = '24px sans-serif';
    ctx.fillText('♥', 18, 32);
    ctx.fillText('♥', layout.canvasWidth - 36, 32);
    ctx.fillText('♥', 18, layout.canvasHeight - 24);
    ctx.fillText('♥', layout.canvasWidth - 36, layout.canvasHeight - 24);
    ctx.globalAlpha = 1;
  } else if (template.motif === 'ribbon') {
    ctx.save();
    ctx.translate(layout.canvasWidth / 2, 26);
    drawCoquetteBow(ctx, 26, '#F472B6', '#BE185D');
    ctx.restore();
  }

  // Outer strip hairline border
  ctx.strokeStyle = template.borderColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, layout.canvasWidth - 4, layout.canvasHeight - 4);

  // Draw each photo frame
  const offscreen = document.createElement('canvas');

  for (let i = 0; i < frameCount; i++) {
    const col = i % layout.columns;
    const row = Math.floor(i / layout.columns);
    const fx = layout.paddingX + col * (layout.frameWidth + layout.gapX);
    const fy = layout.paddingTop + row * (layout.frameHeight + layout.gapY);

    ctx.save();
    drawRoundedRectPath(ctx, fx, fy, layout.frameWidth, layout.frameHeight, template.frameRadius);
    ctx.fillStyle = template.secondaryColor;
    ctx.fill();
    ctx.clip();

    const frameSrc = frames[i];
    if (frameSrc) {
      try {
        const img = await loadHtmlImage(frameSrc);
        if (filter) {
          renderEditedPhotoToCanvas(offscreen, {
            image: img,
            adjustments: {
              brightness: 0,
              contrast: 0,
              saturation: 0,
              exposure: 0,
              temperature: 0,
              sharpness: 0,
              blur: 0,
              grain: 0,
              vignette: 0,
            },
            filter,
            filterIntensity: 100,
            crop: { x: 0, y: 0, width: 1, height: 1 },
            rotation: 0,
            flipH: false,
            flipV: false,
            layers: [],
            maxDimension: 900,
          });
          ctx.drawImage(offscreen, 0, 0, offscreen.width, offscreen.height, fx, fy, layout.frameWidth, layout.frameHeight);
          // Re-render cleanly with cover crop
          ctx.fillStyle = template.secondaryColor;
          ctx.fillRect(fx, fy, layout.frameWidth, layout.frameHeight);
          const offImg = await loadHtmlImage(offscreen.toDataURL('image/png'));
          drawCoverImage(ctx, offImg, fx, fy, layout.frameWidth, layout.frameHeight);
        } else {
          drawCoverImage(ctx, img, fx, fy, layout.frameWidth, layout.frameHeight);
        }
      } catch {
        // Fallback fill if image fails
      }
    } else {
      ctx.fillStyle = template.textColor;
      ctx.globalAlpha = 0.35;
      ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Frame ${i + 1}`, fx + layout.frameWidth / 2, fy + layout.frameHeight / 2);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Subtle frame outline
    ctx.save();
    drawRoundedRectPath(ctx, fx, fy, layout.frameWidth, layout.frameHeight, template.frameRadius);
    ctx.strokeStyle = template.borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Footer branding & caption
  const footerCenterY = layout.canvasHeight - layout.paddingBottom / 2;
  ctx.fillStyle = template.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const mainTitle = caption.trim() ? caption.trim() : template.footerLabel;
  ctx.font = '700 22px "Bricolage Grotesque", sans-serif';
  ctx.fillText(mainTitle, layout.canvasWidth / 2, footerCenterY - 12);

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
  ctx.fillStyle = template.accentColor;
  ctx.font = '500 13px "JetBrains Mono", monospace';
  const subText = showDate ? `CAMCALL · ${today}` : 'Your Moments, Your Style.';
  ctx.fillText(subText, layout.canvasWidth / 2, footerCenterY + 18);
}

export async function renderCollageToCanvas(
  canvas: HTMLCanvasElement,
  options: {
    template: CollageTemplate;
    photos: (string | null)[];
    spacing: number;
    borderWidth: number;
    cornerRadius: number;
    background: string;
    layers: CanvasLayer[];
  }
) {
  const { template, photos, spacing, borderWidth, cornerRadius, background, layers } = options;

  const baseW = 1200;
  const baseH = Math.round(baseW / template.aspectRatio);
  canvas.width = baseW;
  canvas.height = baseH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Fill background (solid or gradient)
  if (background.startsWith('linear-gradient')) {
    const grad = ctx.createLinearGradient(0, 0, baseW, baseH);
    grad.addColorStop(0, '#FCE7F3');
    grad.addColorStop(1, '#EDE9FE');
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = background;
  }
  ctx.fillRect(0, 0, baseW, baseH);

  const outerPadding = Math.max(20, borderWidth + spacing);
  const rects = computeCollageSlotRects(template.slots, baseW, baseH, outerPadding, spacing);

  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    const photoSrc = photos[i];

    ctx.save();
    drawRoundedRectPath(ctx, rect.x, rect.y, rect.width, rect.height, cornerRadius);
    ctx.fillStyle = '#FDF2F8';
    ctx.fill();
    ctx.clip();

    if (photoSrc) {
      try {
        const img = await loadHtmlImage(photoSrc);
        drawCoverImage(ctx, img, rect.x, rect.y, rect.width, rect.height);
      } catch {
        // Keep soft pastel placeholder
      }
    } else {
      ctx.fillStyle = '#9D174D';
      ctx.globalAlpha = 0.35;
      ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Slot ${i + 1}`, rect.x + rect.width / 2, rect.y + rect.height / 2);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    if (borderWidth > 0) {
      ctx.save();
      drawRoundedRectPath(ctx, rect.x, rect.y, rect.width, rect.height, cornerRadius);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.min(borderWidth, 12);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawCanvasLayers(ctx, layers, baseW, baseH);
}

export function exportCanvasDataUrl(canvas: HTMLCanvasElement, options: ExportOptions): string {
  const mime = options.format === 'jpg' ? 'image/jpeg' : 'image/png';
  const quality = clamp(options.quality, 10, 100) / 100;
  return canvas.toDataURL(mime, quality);
}

export function downloadCanvasAsImage(
  canvas: HTMLCanvasElement,
  filenameBase: string,
  options: ExportOptions
): string {
  const dataUrl = exportCanvasDataUrl(canvas, options);
  const ext = options.format === 'jpg' ? 'jpg' : 'png';
  const link = document.createElement('a');
  link.download = `${filenameBase}.${ext}`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return dataUrl;
}
