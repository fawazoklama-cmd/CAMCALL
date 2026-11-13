import type {
  BoothDecorationItem,
  BoothLayoutId,
  BoothQualityPreset,
  BoothShapeId,
  BoothThemePreset,
} from '../types/photobooth';
import type { FilterConfig } from '../types/studio';
import { loadHtmlImage, renderEditedPhotoToCanvas } from './canvasRenderer';
import { clamp } from './imageProcessing';
import { computeBoothLayoutGeometry } from './photoboothLayout';

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
 * Traces any of the 14 Photobooth Frame Shapes centered at (cx, cy) inside box (w, h).
 */
export function traceBoothFrameShape(
  ctx: CanvasRenderingContext2D,
  shapeId: BoothShapeId,
  cx: number,
  cy: number,
  w: number,
  h: number
) {
  const hw = w / 2;
  const hh = h / 2;
  const left = cx - hw;
  const top = cy - hh;
  const minDim = Math.min(w, h);
  const r = minDim / 2;

  ctx.beginPath();

  switch (shapeId) {
    case 'square': {
      drawRoundedRectPath(ctx, cx - minDim / 2, cy - minDim / 2, minDim, minDim, 8);
      return;
    }
    case 'rectangle':
    case 'polaroid':
    case 'film-strip':
    case 'vintage-camera':
    case 'magazine': {
      drawRoundedRectPath(ctx, left, top, w, h, shapeId === 'magazine' ? 4 : 8);
      return;
    }
    case 'rounded': {
      drawRoundedRectPath(ctx, left, top, w, h, Math.min(34, minDim * 0.18));
      return;
    }
    case 'circle': {
      ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2);
      ctx.closePath();
      return;
    }
    case 'oval': {
      ctx.ellipse(cx, cy, hw * 0.94, hh * 0.96, 0, 0, Math.PI * 2);
      ctx.closePath();
      return;
    }
    case 'heart': {
      const s = minDim * 0.47;
      ctx.moveTo(cx, cy + s * 0.88);
      ctx.bezierCurveTo(cx - s * 1.25, cy + s * 0.2, cx - s * 1.05, cy - s * 0.95, cx, cy - s * 0.35);
      ctx.bezierCurveTo(cx + s * 1.05, cy - s * 0.95, cx + s * 1.25, cy + s * 0.2, cx, cy + s * 0.88);
      ctx.closePath();
      return;
    }
    case 'star': {
      const spikes = 5;
      const outerR = r * 0.98;
      const innerR = r * 0.48;
      for (let i = 0; i < spikes * 2; i++) {
        const rad = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI / spikes) * i - Math.PI / 2;
        const px = cx + Math.cos(angle) * rad;
        const py = cy + Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      return;
    }
    case 'cloud': {
      const rx = hw * 0.92;
      const ry = hh * 0.82;
      ctx.moveTo(cx - rx * 0.55, cy + ry * 0.52);
      ctx.bezierCurveTo(cx - rx * 1.05, cy + ry * 0.48, cx - rx * 1.0, cy - ry * 0.35, cx - rx * 0.48, cy - ry * 0.44);
      ctx.bezierCurveTo(cx - rx * 0.35, cy - ry * 1.05, cx + rx * 0.35, cy - ry * 1.05, cx + rx * 0.48, cy - ry * 0.44);
      ctx.bezierCurveTo(cx + rx * 1.0, cy - ry * 0.35, cx + rx * 1.05, cy + ry * 0.48, cx + rx * 0.55, cy + ry * 0.52);
      ctx.closePath();
      return;
    }
    case 'flower': {
      const petals = 8;
      const baseR = r * 0.72;
      const petalR = r * 0.28;
      for (let i = 0; i <= 120; i++) {
        const t = (i / 120) * Math.PI * 2;
        const rad = baseR + Math.abs(Math.sin((petals * t) / 2)) * petalR;
        const px = cx + Math.cos(t) * rad;
        const py = cy + Math.sin(t) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      return;
    }
    case 'ticket': {
      const notch = minDim * 0.1;
      ctx.moveTo(left + notch, top);
      ctx.lineTo(left + w - notch, top);
      ctx.arc(left + w, top, notch, Math.PI, Math.PI * 0.5, true);
      ctx.lineTo(left + w, top + h - notch);
      ctx.arc(left + w, top + h, notch, Math.PI * 1.5, Math.PI, true);
      ctx.lineTo(left + notch, top + h);
      ctx.arc(left, top + h, notch, 0, Math.PI * 1.5, true);
      ctx.lineTo(left, top + notch);
      ctx.arc(left, top, notch, Math.PI * 0.5, 0, true);
      ctx.closePath();
      return;
    }
  }
}

function drawCoquetteBow(ctx: CanvasRenderingContext2D, size: number, color: string, accent: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(2, size * 0.06);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-size * 0.48, -size * 0.44, -size * 0.7, size * 0.24, 0, size * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(size * 0.48, -size * 0.44, size * 0.7, size * 0.24, 0, size * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, size * 0.02, size * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export interface RenderBoothOutputOptions {
  frames: (string | null)[];
  layoutId: BoothLayoutId;
  shapeId: BoothShapeId;
  theme: BoothThemePreset;
  filter: FilterConfig | null;
  caption?: string;
  showDate?: boolean;
  customBgColor?: string | null;
  customBorderColor?: string | null;
  decorations: BoothDecorationItem[];
  quality: BoothQualityPreset;
}

export async function renderUltimatePhotoboothToCanvas(
  canvas: HTMLCanvasElement,
  options: RenderBoothOutputOptions
) {
  const {
    frames,
    layoutId,
    shapeId,
    theme,
    filter,
    caption = '',
    showDate = true,
    customBgColor = null,
    customBorderColor = null,
    decorations,
    quality,
  } = options;

  const geom = computeBoothLayoutGeometry(layoutId, quality);
  canvas.width = geom.canvasWidth;
  canvas.height = geom.canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Background Fill (Custom color OR Theme Gradient OR Theme Solid)
  if (customBgColor) {
    ctx.fillStyle = customBgColor;
    ctx.fillRect(0, 0, geom.canvasWidth, geom.canvasHeight);
  } else if (theme.backgroundGradient) {
    const grad = ctx.createLinearGradient(0, 0, geom.canvasWidth, geom.canvasHeight);
    const hexMatches = theme.backgroundGradient.match(/#[0-9a-fA-F]{6}/g) || [theme.backgroundColor, theme.secondaryColor];
    if (hexMatches.length >= 2) {
      hexMatches.forEach((hex, idx) => {
        grad.addColorStop(idx / (hexMatches.length - 1), hex);
      });
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = theme.backgroundColor;
    }
    ctx.fillRect(0, 0, geom.canvasWidth, geom.canvasHeight);
  } else {
    ctx.fillStyle = theme.backgroundColor;
    ctx.fillRect(0, 0, geom.canvasWidth, geom.canvasHeight);
  }

  // 2. Theme Background Motif Decorations
  ctx.save();
  if (theme.motif === 'film') {
    ctx.fillStyle = theme.accentColor;
    ctx.globalAlpha = 0.72;
    for (let y = 26; y < geom.canvasHeight - 26; y += 38) {
      drawRoundedRectPath(ctx, 12, y, 16, 22, 3);
      ctx.fill();
      drawRoundedRectPath(ctx, geom.canvasWidth - 28, y, 16, 22, 3);
      ctx.fill();
    }
  } else if (theme.motif === 'hearts') {
    ctx.fillStyle = theme.accentColor;
    ctx.globalAlpha = 0.16;
    ctx.font = '26px sans-serif';
    for (let y = 40; y < geom.canvasHeight; y += 140) {
      ctx.fillText('♥', 18, y);
      ctx.fillText('♥', geom.canvasWidth - 42, y + 40);
    }
  } else if (theme.motif === 'stars' || theme.motif === 'y2k') {
    ctx.fillStyle = theme.accentColor;
    ctx.globalAlpha = 0.25;
    ctx.font = '22px sans-serif';
    for (let y = 42; y < geom.canvasHeight; y += 130) {
      ctx.fillText('✦', 20, y);
      ctx.fillText('★', geom.canvasWidth - 40, y + 36);
    }
  } else if (theme.motif === 'flowers') {
    ctx.fillStyle = theme.accentColor;
    ctx.globalAlpha = 0.24;
    ctx.font = '24px sans-serif';
    for (let y = 46; y < geom.canvasHeight; y += 150) {
      ctx.fillText('✿', 18, y);
      ctx.fillText('✿', geom.canvasWidth - 42, y + 50);
    }
  } else if (theme.motif === 'ribbon') {
    ctx.translate(geom.canvasWidth / 2, 26);
    drawCoquetteBow(ctx, 30, '#F472B6', '#BE185D');
  }
  ctx.restore();

  // Outer strip border
  const activeBorder = customBorderColor || theme.borderColor;
  ctx.save();
  ctx.strokeStyle = activeBorder;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, geom.canvasWidth - 6, geom.canvasHeight - 6);
  ctx.restore();

  // 3. Draw Each Photo Slot inside Selected Shape + Frame Styling
  const offscreen = document.createElement('canvas');

  for (let i = 0; i < geom.slots.length; i++) {
    const slot = geom.slots[i];
    const cx = slot.x + slot.w / 2;
    const cy = slot.y + slot.h / 2;

    ctx.save();
    ctx.translate(cx, cy);
    if (slot.rotation) {
      ctx.rotate((slot.rotation * Math.PI) / 180);
    }

    // Polaroid card outer white pad
    let photoW = slot.w;
    let photoH = slot.h;
    let photoOffsetY = 0;

    if (shapeId === 'polaroid') {
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(45,27,40,0.12)';
      ctx.shadowBlur = 14;
      drawRoundedRectPath(ctx, -slot.w / 2, -slot.h / 2, slot.w, slot.h, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = activeBorder;
      ctx.lineWidth = 2;
      ctx.stroke();

      photoW = slot.w * 0.88;
      photoH = slot.h * 0.78;
      photoOffsetY = -slot.h * 0.05;
    }

    // Clip to active BoothShapeId
    ctx.save();
    traceBoothFrameShape(ctx, shapeId, 0, photoOffsetY, photoW, photoH);
    ctx.fillStyle = theme.secondaryColor;
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
            maxDimension: 1000,
          });
          const filteredImg = await loadHtmlImage(offscreen.toDataURL('image/png'));
          drawCoverImage(ctx, filteredImg, -photoW / 2, photoOffsetY - photoH / 2, photoW, photoH);
        } else {
          drawCoverImage(ctx, img, -photoW / 2, photoOffsetY - photoH / 2, photoW, photoH);
        }
      } catch {
        // Keep placeholder background
      }
    } else {
      ctx.fillStyle = theme.textColor;
      ctx.globalAlpha = 0.35;
      ctx.font = `600 ${Math.max(16, Math.round(photoW * 0.075))}px "${theme.fontFamily}", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Frame ${i + 1}`, 0, photoOffsetY);
      ctx.globalAlpha = 1;
    }

    // Extra internal details for Film Strip, Vintage Camera, and Magazine shapes
    if (shapeId === 'film-strip') {
      ctx.fillStyle = 'rgba(24,24,27,0.85)';
      ctx.fillRect(-photoW / 2, -photoH / 2, photoW, 14);
      ctx.fillRect(-photoW / 2, photoH / 2 - 14, photoW, 14);
      ctx.fillStyle = '#FDF2F8';
      for (let sx = -photoW / 2 + 12; sx < photoW / 2 - 12; sx += 26) {
        ctx.fillRect(sx, -photoH / 2 + 3, 12, 8);
        ctx.fillRect(sx, photoH / 2 - 11, 12, 8);
      }
    } else if (shapeId === 'vintage-camera') {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2.5;
      const b = Math.min(photoW, photoH) * 0.12;
      const l = -photoW / 2 + 12;
      const r = photoW / 2 - 12;
      const t = -photoH / 2 + 12;
      const bt = photoH / 2 - 12;
      // Corner brackets
      ctx.beginPath();
      ctx.moveTo(l, t + b); ctx.lineTo(l, t); ctx.lineTo(l + b, t);
      ctx.moveTo(r - b, t); ctx.lineTo(r, t); ctx.lineTo(r, t + b);
      ctx.moveTo(l, bt - b); ctx.lineTo(l, bt); ctx.lineTo(l + b, bt);
      ctx.moveTo(r - b, bt); ctx.lineTo(r, bt); ctx.lineTo(r, bt - b);
      ctx.stroke();
    } else if (shapeId === 'magazine' && i === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `700 ${Math.max(18, Math.round(photoW * 0.09))}px "Playfair Display", serif`;
      ctx.textAlign = 'center';
      ctx.fillText('CAMCALL', 0, -photoH / 2 + Math.max(24, photoH * 0.09));
    }

    ctx.restore();

    // Shape outline stroke
    if (shapeId !== 'polaroid') {
      ctx.save();
      traceBoothFrameShape(ctx, shapeId, 0, 0, photoW, photoH);
      ctx.strokeStyle = activeBorder;
      ctx.lineWidth = Math.max(3, Math.round(geom.canvasWidth * 0.004));
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  // 4. Magazine Layout top masthead if selected
  if (layoutId === 'magazine-layout') {
    ctx.save();
    ctx.fillStyle = theme.textColor;
    ctx.textAlign = 'center';
    ctx.font = `700 ${Math.round(geom.canvasWidth * 0.055)}px "Playfair Display", serif`;
    ctx.fillText('CAMCALL MAGAZINE', geom.canvasWidth / 2, Math.round(geom.canvasHeight * 0.075));
    ctx.restore();
  }

  // 5. Footer Title + Date Stamp (free, zero watermark)
  ctx.save();
  ctx.fillStyle = theme.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const titleText = caption.trim() ? caption.trim() : theme.footerLabel;
  const titleSize = Math.max(20, Math.round(geom.canvasWidth * 0.032));
  ctx.font = `700 ${titleSize}px "${theme.fontFamily}", sans-serif`;
  ctx.fillText(titleText, geom.canvasWidth / 2, geom.footerY - 12);

  if (showDate) {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
    ctx.fillStyle = theme.accentColor;
    ctx.font = `500 ${Math.max(13, Math.round(geom.canvasWidth * 0.019))}px "JetBrains Mono", monospace`;
    ctx.fillText(`${today} · Your Moments, Your Style.`, geom.canvasWidth / 2, geom.footerY + 18);
  }
  ctx.restore();

  // 6. Post-Capture Decorations (Stickers, Doodles, Hearts, Stars, Flowers, Ribbons, Text, Date, Timestamp)
  for (const dec of decorations) {
    ctx.save();
    ctx.globalAlpha = clamp(dec.opacity, 0, 1);
    const px = dec.x * geom.canvasWidth;
    const py = dec.y * geom.canvasHeight;
    ctx.translate(px, py);
    ctx.rotate((dec.rotation * Math.PI) / 180);

    const baseSize = Math.min(geom.canvasWidth, geom.canvasHeight) * 0.09 * dec.scale;

    if (dec.kind === 'text' || dec.kind === 'date' || dec.kind === 'timestamp') {
      const fontSize = Math.max(18, Math.round(baseSize * 0.62));
      const fontFam = dec.fontFamily || 'Playfair Display';
      ctx.font = `700 ${fontSize}px "${fontFam}", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (dec.bgColor) {
        const m = ctx.measureText(dec.symbol);
        const bw = m.width + fontSize * 0.9;
        const bh = fontSize * 1.65;
        ctx.fillStyle = dec.bgColor;
        drawRoundedRectPath(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
        ctx.fill();
      }
      ctx.fillStyle = dec.color;
      ctx.fillText(dec.symbol, 0, 0);
    } else {
      ctx.font = `${Math.round(baseSize)}px "Plus Jakarta Sans", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = dec.color;
      ctx.fillText(dec.symbol, 0, 0);
    }
    ctx.restore();
  }
}
