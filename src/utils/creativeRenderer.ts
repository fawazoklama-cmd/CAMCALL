import {
  BACKGROUND_PRESETS,
  FRAME_PRESETS,
  PHOTO_LAYOUT_PRESETS,
  THEME_PRESETS,
} from '../data/creativePresets';
import { FILTER_PRESETS } from '../data/presets';
import type {
  BackgroundPreset,
  CreativeDesignState,
  CreativeObject,
  FrameId,
  ShapeId,
} from '../types/creative';
import { loadHtmlImage, renderEditedPhotoToCanvas } from './canvasRenderer';
import { computeCreativeLayoutSlots } from './creativeGeometry';
import { clamp } from './imageProcessing';

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
 * Traces any of the 22 Basic & Creative Shapes centered at (cx, cy) within box (w, h).
 */
export function traceShapePath(
  ctx: CanvasRenderingContext2D,
  shapeId: ShapeId,
  cx: number,
  cy: number,
  w: number,
  h: number,
  cornerRadius = 18
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
      const side = minDim;
      drawRoundedRectPath(ctx, cx - side / 2, cy - side / 2, side, side, Math.min(cornerRadius, 12));
      return;
    }
    case 'rectangle': {
      drawRoundedRectPath(ctx, left, top, w, h, 2);
      return;
    }
    case 'rounded-rectangle': {
      drawRoundedRectPath(ctx, left, top, w, h, Math.max(12, cornerRadius));
      return;
    }
    case 'circle': {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      return;
    }
    case 'oval': {
      ctx.ellipse(cx, cy, hw, hh, 0, 0, Math.PI * 2);
      ctx.closePath();
      return;
    }
    case 'capsule': {
      drawRoundedRectPath(ctx, left, top, w, h, minDim / 2);
      return;
    }
    case 'diamond': {
      ctx.moveTo(cx, top);
      ctx.lineTo(left + w, cy);
      ctx.lineTo(cx, top + h);
      ctx.lineTo(left, cy);
      ctx.closePath();
      return;
    }
    case 'hexagon': {
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const px = cx + Math.cos(angle) * hw * 0.96;
        const py = cy + Math.sin(angle) * hh * 0.96;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
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
    case 'heart': {
      const s = minDim * 0.48;
      ctx.moveTo(cx, cy + s * 0.88);
      ctx.bezierCurveTo(cx - s * 1.25, cy + s * 0.2, cx - s * 1.05, cy - s * 0.95, cx, cy - s * 0.35);
      ctx.bezierCurveTo(cx + s * 1.05, cy - s * 0.95, cx + s * 1.25, cy + s * 0.2, cx, cy + s * 0.88);
      ctx.closePath();
      return;
    }
    case 'cloud': {
      const rx = hw * 0.92;
      const ry = hh * 0.78;
      ctx.moveTo(cx - rx * 0.55, cy + ry * 0.48);
      ctx.bezierCurveTo(cx - rx * 1.05, cy + ry * 0.45, cx - rx * 1.0, cy - ry * 0.35, cx - rx * 0.48, cy - ry * 0.42);
      ctx.bezierCurveTo(cx - rx * 0.35, cy - ry * 1.05, cx + rx * 0.35, cy - ry * 1.05, cx + rx * 0.48, cy - ry * 0.42);
      ctx.bezierCurveTo(cx + rx * 1.0, cy - ry * 0.35, cx + rx * 1.05, cy + ry * 0.45, cx + rx * 0.55, cy + ry * 0.48);
      ctx.closePath();
      return;
    }
    case 'flower': {
      const petals = 8;
      const baseR = r * 0.72;
      const amp = r * 0.24;
      const steps = 96;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const rad = baseR + Math.abs(Math.cos((petals / 2) * a)) * amp;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      return;
    }
    case 'flower-petal': {
      const petals = 5;
      const baseR = r * 0.68;
      const amp = r * 0.28;
      const steps = 96;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2 - Math.PI / 2;
        const rad = baseR + Math.max(0, Math.cos(petals * a)) * amp;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      return;
    }
    case 'scalloped-circle': {
      const bumps = 14;
      const baseR = r * 0.84;
      const amp = r * 0.12;
      const steps = 112;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const rad = baseR + Math.abs(Math.sin((bumps / 2) * a)) * amp;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      return;
    }
    case 'wavy-frame': {
      const steps = 100;
      const ampX = hw * 0.06;
      const ampY = hh * 0.06;
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < steps; i++) {
        const t = (i / steps) * 4;
        let x = 0;
        let y = 0;
        if (t < 1) {
          x = left + w * t;
          y = top + Math.sin(t * Math.PI * 6) * ampY + ampY;
        } else if (t < 2) {
          const u = t - 1;
          x = left + w - ampX + Math.sin(u * Math.PI * 6) * ampX;
          y = top + h * u;
        } else if (t < 3) {
          const u = t - 2;
          x = left + w * (1 - u);
          y = top + h - ampY + Math.sin(u * Math.PI * 6) * ampY;
        } else {
          const u = t - 3;
          x = left + ampX + Math.sin(u * Math.PI * 6) * ampX;
          y = top + h * (1 - u);
        }
        pts.push({ x, y });
      }
      pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      return;
    }
    case 'blob-shape': {
      const steps = 72;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const radX = hw * (0.84 + 0.11 * Math.sin(a * 3 + 0.6) + 0.05 * Math.cos(a * 5));
        const radY = hh * (0.84 + 0.1 * Math.cos(a * 2 - 0.4) + 0.06 * Math.sin(a * 4));
        const px = cx + Math.cos(a) * radX;
        const py = cy + Math.sin(a) * radY;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      return;
    }
    case 'irregular-organic': {
      const steps = 64;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const radX = hw * (0.82 + 0.13 * Math.cos(a * 3 - 1.1) + 0.06 * Math.sin(a * 7));
        const radY = hh * (0.82 + 0.12 * Math.sin(a * 4 + 0.9) + 0.05 * Math.cos(a * 6));
        const px = cx + Math.cos(a) * radX;
        const py = cy + Math.sin(a) * radY;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      return;
    }
    case 'arch-frame': {
      const archR = hw;
      ctx.moveTo(left, top + h);
      ctx.lineTo(left, top + archR);
      ctx.arc(cx, top + archR, archR, Math.PI, 0, false);
      ctx.lineTo(left + w, top + h);
      ctx.closePath();
      return;
    }
    case 'ticket-shape': {
      const notch = minDim * 0.1;
      ctx.moveTo(left + notch, top);
      ctx.lineTo(left + w - notch, top);
      ctx.arc(left + w, top, notch, Math.PI, Math.PI / 2, true);
      ctx.lineTo(left + w, cy - notch * 0.8);
      ctx.arc(left + w, cy, notch * 0.8, -Math.PI / 2, Math.PI / 2, true);
      ctx.lineTo(left + w, top + h - notch);
      ctx.arc(left + w, top + h, notch, -Math.PI / 2, Math.PI, true);
      ctx.lineTo(left + notch, top + h);
      ctx.arc(left, top + h, notch, 0, -Math.PI / 2, true);
      ctx.lineTo(left, cy + notch * 0.8);
      ctx.arc(left, cy, notch * 0.8, Math.PI / 2, -Math.PI / 2, true);
      ctx.lineTo(left, top + notch);
      ctx.arc(left, top, notch, Math.PI / 2, 0, true);
      ctx.closePath();
      return;
    }
    case 'polaroid-shape':
    case 'film-frame': {
      drawRoundedRectPath(ctx, left, top, w, h, Math.min(cornerRadius, 16));
      return;
    }
    case 'speech-bubble': {
      const bodyH = h * 0.84;
      const rad = Math.min(28, minDim * 0.16);
      ctx.moveTo(left + rad, top);
      ctx.lineTo(left + w - rad, top);
      ctx.quadraticCurveTo(left + w, top, left + w, top + rad);
      ctx.lineTo(left + w, top + bodyH - rad);
      ctx.quadraticCurveTo(left + w, top + bodyH, left + w - rad, top + bodyH);
      ctx.lineTo(cx + w * 0.08, top + bodyH);
      ctx.lineTo(cx - w * 0.08, top + h);
      ctx.lineTo(cx - w * 0.06, top + bodyH);
      ctx.lineTo(left + rad, top + bodyH);
      ctx.quadraticCurveTo(left, top + bodyH, left, top + bodyH - rad);
      ctx.lineTo(left, top + rad);
      ctx.quadraticCurveTo(left, top, left + rad, top);
      ctx.closePath();
      return;
    }
  }
}

function drawCoverImageInBox(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  zoom = 100,
  offsetX = 0,
  offsetY = 0
) {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const srcRatio = srcW / srcH;
  const dstRatio = dw / dh;

  let drawW = dw;
  let drawH = dh;
  if (srcRatio > dstRatio) {
    drawH = dh;
    drawW = dh * srcRatio;
  } else {
    drawW = dw;
    drawH = dw / srcRatio;
  }

  const scale = clamp(zoom, 100, 240) / 100;
  drawW *= scale;
  drawH *= scale;

  const cx = dx + dw / 2 + (offsetX / 100) * dw * 0.6;
  const cy = dy + dh / 2 + (offsetY / 100) * dh * 0.6;
  ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
}

/**
 * Draws any of the 23 Background Collection presets or custom uploaded background image.
 */
export async function drawCreativeBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundId: string,
  customBackgroundSrc: string | null
) {
  if (customBackgroundSrc) {
    try {
      const bgImg = await loadHtmlImage(customBackgroundSrc);
      drawCoverImageInBox(ctx, bgImg, 0, 0, width, height);
      return;
    } catch {
      // Fall back to preset
    }
  }

  const bg: BackgroundPreset =
    BACKGROUND_PRESETS.find((b) => b.id === backgroundId) || BACKGROUND_PRESETS[0];

  ctx.save();
  ctx.fillStyle = bg.baseColor;
  ctx.fillRect(0, 0, width, height);

  const sec = bg.secondaryColor || '#FFFFFF';

  switch (bg.patternKind) {
    case 'gradient': {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, bg.baseColor);
      grad.addColorStop(0.5, '#FFF0F6');
      grad.addColorStop(1, sec);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      break;
    }
    case 'polka-dots': {
      ctx.fillStyle = sec;
      const step = 46;
      for (let y = 18; y < height + step; y += step) {
        const offset = Math.floor(y / step) % 2 === 0 ? 0 : step / 2;
        for (let x = 18 + offset; x < width + step; x += step) {
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'checkerboard': {
      ctx.fillStyle = sec;
      const cell = 48;
      for (let y = 0; y < height; y += cell) {
        for (let x = 0; x < width; x += cell) {
          if ((Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0) {
            ctx.fillRect(x, y, cell, cell);
          }
        }
      }
      break;
    }
    case 'stripes': {
      ctx.fillStyle = sec;
      const stripeW = 30;
      for (let x = 0; x < width; x += stripeW * 2) {
        ctx.fillRect(x, 0, stripeW, height);
      }
      break;
    }
    case 'grid': {
      ctx.strokeStyle = sec;
      ctx.lineWidth = 2;
      const step = 40;
      for (let x = 0; x <= width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      break;
    }
    case 'hearts':
    case 'stars':
    case 'flowers':
    case 'clouds': {
      const symbol =
        bg.patternKind === 'hearts'
          ? '♥'
          : bg.patternKind === 'stars'
          ? '✦'
          : bg.patternKind === 'flowers'
          ? '✿'
          : '☁';
      ctx.fillStyle = sec;
      ctx.globalAlpha = bg.patternKind === 'clouds' ? 0.85 : 0.35;
      ctx.font = bg.patternKind === 'clouds' ? '34px sans-serif' : '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const step = 76;
      for (let y = 30; y < height + step; y += step) {
        const offset = Math.floor(y / step) % 2 === 0 ? 0 : step / 2;
        for (let x = 30 + offset; x < width + step; x += step) {
          ctx.fillText(symbol, x, y);
        }
      }
      break;
    }
    case 'glitter':
    case 'glitter-texture': {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, bg.baseColor);
      grad.addColorStop(1, sec);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      let seed = 4242;
      for (let i = 0; i < 240; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const px = ((seed & 0xffff) / 65535) * width;
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const py = ((seed & 0xffff) / 65535) * height;
        const size = (i % 4) + 1.5;
        ctx.fillStyle = i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? '#F472B6' : '#C4B5FD';
        ctx.globalAlpha = 0.5 + (i % 5) * 0.1;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'paper':
    case 'vintage-paper':
    case 'film-grain':
    case 'soft-noise': {
      let seed = 9001;
      const dots = bg.patternKind === 'film-grain' ? 3500 : 2200;
      for (let i = 0; i < dots; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const px = ((seed & 0xffff) / 65535) * width;
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const py = ((seed & 0xffff) / 65535) * height;
        ctx.fillStyle = i % 2 === 0 ? sec : '#FFFFFF';
        ctx.globalAlpha = bg.patternKind === 'film-grain' ? 0.16 : 0.12;
        ctx.fillRect(px, py, 2, 2);
      }
      if (bg.patternKind === 'vintage-paper') {
        const vig = ctx.createRadialGradient(width / 2, height / 2, width * 0.2, width / 2, height / 2, width * 0.78);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(120, 75, 35, 0.22)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, width, height);
      }
      break;
    }
    case 'fabric': {
      ctx.strokeStyle = sec;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.5;
      for (let x = 0; x < width; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 10) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      break;
    }
    default:
      break;
  }

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

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-size * 0.45, -size * 0.42, -size * 0.68, size * 0.22, 0, size * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(size * 0.45, -size * 0.42, size * 0.68, size * 0.22, 0, size * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-size * 0.05, size * 0.04);
  ctx.lineTo(-size * 0.3, size * 0.44);
  ctx.lineTo(-size * 0.1, size * 0.34);
  ctx.lineTo(0, size * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(size * 0.05, size * 0.04);
  ctx.lineTo(size * 0.3, size * 0.44);
  ctx.lineTo(size * 0.1, size * 0.34);
  ctx.lineTo(0, size * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, size * 0.02, size * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws any of the 15 Frame Collection styles around the canvas perimeter.
 */
export function drawCreativeFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frameId: FrameId,
  caption: string
) {
  if (frameId === 'none') return;
  const preset = FRAME_PRESETS.find((f) => f.id === frameId);
  if (!preset) return;

  ctx.save();
  const minDim = Math.min(width, height);
  const pad = Math.round(minDim * 0.045);

  const drawOuterMat = (top: number, side: number, bottom: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, top);
    ctx.fillRect(0, height - bottom, width, bottom);
    ctx.fillRect(0, 0, side, height);
    ctx.fillRect(width - side, 0, side, height);
  };

  const label = caption.trim() || 'CAMCALL STUDIO';

  switch (frameId) {
    case 'classic-white':
    case 'pink-border': {
      drawOuterMat(pad, pad, pad, preset.primaryColor);
      ctx.strokeStyle = preset.accentColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);
      break;
    }
    case 'polaroid': {
      const bottom = Math.round(minDim * 0.14);
      drawOuterMat(pad, pad, bottom, '#FFFFFF');
      ctx.strokeStyle = '#F3D5E5';
      ctx.lineWidth = 2;
      ctx.strokeRect(pad, pad, width - pad * 2, height - pad - bottom);
      ctx.fillStyle = '#2D1B28';
      ctx.font = `700 ${Math.round(minDim * 0.032)}px "Bricolage Grotesque", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, width / 2, height - bottom / 2);
      break;
    }
    case 'film-camera': {
      const side = Math.round(minDim * 0.065);
      drawOuterMat(pad, side, pad, '#231B20');
      ctx.fillStyle = '#FDF2F8';
      for (let y = pad; y < height - pad; y += 38) {
        drawRoundedRectPath(ctx, 14, y, side - 28, 22, 4);
        ctx.fill();
        drawRoundedRectPath(ctx, width - side + 14, y, side - 28, 22, 4);
        ctx.fill();
      }
      ctx.fillStyle = '#F9A8D4';
      ctx.font = `600 ${Math.round(minDim * 0.02)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`CAMCALL 400 · ${label}`, width / 2, height - pad / 2 + 4);
      break;
    }
    case 'vintage-border': {
      drawOuterMat(pad * 1.1, pad * 1.1, pad * 1.2, '#FFF7ED');
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 3;
      ctx.strokeRect(pad * 0.7, pad * 0.7, width - pad * 1.4, height - pad * 1.5);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pad * 1.1, pad * 1.1, width - pad * 2.2, height - pad * 2.3);
      break;
    }
    case 'heart-frame':
    case 'flower-frame':
    case 'star-frame': {
      drawOuterMat(pad, pad, pad, preset.primaryColor);
      ctx.strokeStyle = preset.accentColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);
      const glyph = frameId === 'heart-frame' ? '♥' : frameId === 'flower-frame' ? '🌸' : '★';
      ctx.fillStyle = preset.accentColor;
      ctx.font = `${Math.round(minDim * 0.04)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(glyph, pad * 0.9, pad * 0.9);
      ctx.fillText(glyph, width - pad * 0.9, pad * 0.9);
      ctx.fillText(glyph, pad * 0.9, height - pad * 0.9);
      ctx.fillText(glyph, width - pad * 0.9, height - pad * 0.9);
      break;
    }
    case 'ribbon-frame': {
      drawOuterMat(pad, pad, pad, '#FDF2F8');
      ctx.strokeStyle = '#F472B6';
      ctx.lineWidth = 3;
      ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);
      ctx.save();
      ctx.translate(width / 2, pad * 0.65);
      drawCoquetteBow(ctx, minDim * 0.055, '#F472B6', '#BE185D');
      ctx.restore();
      break;
    }
    case 'newspaper-frame': {
      const top = Math.round(minDim * 0.13);
      const bottom = Math.round(minDim * 0.08);
      drawOuterMat(top, pad, bottom, '#F5F5F4');
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 3;
      ctx.strokeRect(pad * 0.6, pad * 0.6, width - pad * 1.2, height - pad * 1.2);
      ctx.fillStyle = '#1C1917';
      ctx.font = `700 ${Math.round(minDim * 0.036)}px "Playfair Display", Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillText('THE CAMCALL TIMES', width / 2, top * 0.45);
      ctx.font = `500 ${Math.round(minDim * 0.017)}px "JetBrains Mono", monospace`;
      ctx.fillText(`SPECIAL EDITION · ${label}`, width / 2, top * 0.8);
      break;
    }
    case 'magazine-frame': {
      drawOuterMat(pad, pad, pad, '#FFFFFF');
      ctx.fillStyle = '#DB2777';
      ctx.font = `700 ${Math.round(minDim * 0.075)}px "Playfair Display", Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillText('CAMCALL', width / 2, pad + minDim * 0.08);
      ctx.fillStyle = '#2D1B28';
      ctx.font = `600 ${Math.round(minDim * 0.024)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(label, width / 2, height - pad - minDim * 0.02);
      break;
    }
    case 'scrapbook-frame': {
      drawOuterMat(pad, pad, pad, '#FFFBEB');
      // Corner masking tapes
      ctx.save();
      ctx.translate(pad * 1.4, pad * 1.1);
      ctx.rotate(-0.45);
      ctx.fillStyle = 'rgba(244, 114, 182, 0.55)';
      ctx.fillRect(-42, -12, 84, 24);
      ctx.restore();

      ctx.save();
      ctx.translate(width - pad * 1.4, pad * 1.1);
      ctx.rotate(0.45);
      ctx.fillStyle = 'rgba(167, 139, 250, 0.55)';
      ctx.fillRect(-42, -12, 84, 24);
      ctx.restore();
      break;
    }
    case 'retro-digicam-frame': {
      drawOuterMat(pad * 0.8, pad * 0.8, pad * 0.8, '#1E1B4B');
      ctx.strokeStyle = '#F472B6';
      ctx.lineWidth = 2;
      ctx.strokeRect(pad * 1.1, pad * 1.1, width - pad * 2.2, height - pad * 2.2);
      ctx.fillStyle = '#F43F5E';
      ctx.beginPath();
      ctx.arc(pad * 1.8, pad * 1.8, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F8FAFC';
      ctx.font = `600 ${Math.round(minDim * 0.022)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('REC  2004.11.13', pad * 2.2, pad * 1.9);
      ctx.textAlign = 'right';
      ctx.fillText('BAT [███]', width - pad * 1.6, pad * 1.9);
      break;
    }
    case 'korean-photo-frame': {
      const bottom = Math.round(minDim * 0.11);
      drawOuterMat(pad, pad, bottom, '#FFF8FB');
      ctx.strokeStyle = '#F3D5E5';
      ctx.lineWidth = 2;
      ctx.strokeRect(pad, pad, width - pad * 2, height - pad - bottom);
      ctx.fillStyle = '#DB2777';
      ctx.font = `700 ${Math.round(minDim * 0.026)}px "Bricolage Grotesque", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`CAMCALL ♡ ${label}`, width / 2, height - bottom * 0.52);
      break;
    }
    case 'y2k-frame': {
      drawOuterMat(pad, pad, pad, '#EDE9FE');
      ctx.strokeStyle = '#A855F7';
      ctx.lineWidth = 4;
      ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);
      ctx.fillStyle = '#DB2777';
      ctx.font = `700 ${Math.round(minDim * 0.025)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`★ ${label} ★`, width / 2, height - pad / 2 + 2);
      break;
    }
  }

  ctx.restore();
}

function drawPaperTapeObject(
  ctx: CanvasRenderingContext2D,
  obj: CreativeObject,
  canvasWidth: number,
  canvasHeight: number
) {
  const cx = obj.x * canvasWidth;
  const cy = obj.y * canvasHeight;
  const w = obj.width * canvasWidth * obj.scale;
  const h = obj.height * canvasHeight * obj.scale;

  ctx.save();
  ctx.globalAlpha = clamp(obj.opacity, 0, 1);
  ctx.translate(cx, cy);
  ctx.rotate((obj.rotation * Math.PI) / 180);

  if (obj.paperKind === 'tape') {
    ctx.fillStyle = obj.color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    if (obj.paperPattern === 'stripes') {
      ctx.fillStyle = obj.accentColor || '#F472B6';
      for (let x = -w / 2; x < w / 2; x += 18) {
        ctx.fillRect(x, -h / 2, 7, h);
      }
    } else if (obj.paperPattern === 'dots') {
      ctx.fillStyle = obj.accentColor || '#FFFFFF';
      for (let x = -w / 2 + 12; x < w / 2; x += 22) {
        ctx.beginPath();
        ctx.arc(x, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (obj.paperKind === 'stamp') {
    ctx.fillStyle = obj.color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = obj.accentColor || '#DB2777';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 3;
    ctx.strokeRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12);
    ctx.setLineDash([]);
    ctx.fillStyle = obj.accentColor || '#DB2777';
    ctx.font = `700 ${Math.max(12, Math.round(h * 0.15))}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(obj.text || 'SEOUL', 0, 0);
  } else if (obj.paperKind === 'ticket') {
    traceShapePath(ctx, 'ticket-shape', 0, 0, w, h, 8);
    ctx.fillStyle = obj.color;
    ctx.fill();
    ctx.strokeStyle = obj.accentColor || '#7C3AED';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = obj.accentColor || '#7C3AED';
    ctx.font = `700 ${Math.max(12, Math.round(h * 0.22))}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(obj.text || 'CAMCALL TICKET', 0, 0);
  } else {
    // Memo / Diary Paper card
    drawRoundedRectPath(ctx, -w / 2, -h / 2, w, h, 10);
    ctx.fillStyle = obj.color;
    ctx.fill();
    ctx.strokeStyle = obj.accentColor || '#F472B6';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (obj.paperPattern === 'lined') {
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.25)';
      ctx.lineWidth = 1.5;
      for (let y = -h / 2 + 34; y < h / 2 - 12; y += 22) {
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 14, y);
        ctx.lineTo(w / 2 - 14, y);
        ctx.stroke();
      }
    } else if (obj.paperPattern === 'grid') {
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.18)';
      ctx.lineWidth = 1;
      for (let x = -w / 2 + 18; x < w / 2; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, -h / 2 + 10);
        ctx.lineTo(x, h / 2 - 10);
        ctx.stroke();
      }
      for (let y = -h / 2 + 24; y < h / 2; y += 20) {
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 10, y);
        ctx.lineTo(w / 2 - 10, y);
        ctx.stroke();
      }
    }

    if (obj.text) {
      ctx.fillStyle = obj.accentColor || '#DB2777';
      ctx.font = `700 ${Math.max(12, Math.round(h * 0.14))}px "Bricolage Grotesque", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(obj.text, 0, -h / 2 + 22);
    }
  }

  ctx.restore();
}

function drawVectorDecoration(
  ctx: CanvasRenderingContext2D,
  obj: CreativeObject,
  size: number
) {
  if (obj.symbol === 'bow-vector') {
    drawCoquetteBow(ctx, size, obj.color, obj.accentColor || '#BE185D');
  } else if (obj.symbol === 'butterfly-vector') {
    ctx.fillStyle = obj.color;
    ctx.strokeStyle = obj.accentColor || '#7C3AED';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-size * 0.28, -size * 0.14, size * 0.28, size * 0.22, -0.4, 0, Math.PI * 2);
    ctx.ellipse(size * 0.28, -size * 0.14, size * 0.28, size * 0.22, 0.4, 0, Math.PI * 2);
    ctx.ellipse(-size * 0.22, size * 0.2, size * 0.2, size * 0.16, 0.3, 0, Math.PI * 2);
    ctx.ellipse(size * 0.22, size * 0.2, size * 0.2, size * 0.16, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (obj.symbol === 'cloud-vector') {
    traceShapePath(ctx, 'cloud', 0, 0, size * 1.15, size * 0.78);
    ctx.fillStyle = obj.color;
    ctx.fill();
    ctx.strokeStyle = obj.accentColor || '#F472B6';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else {
    ctx.font = `${Math.round(size)}px "Plus Jakarta Sans", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = obj.color;
    ctx.fillText(obj.symbol || '♥', 0, 0);
  }
}

async function applyFilterToImageElement(
  img: HTMLImageElement,
  filterId: string | null,
  filterIntensity: number
): Promise<HTMLCanvasElement> {
  const offscreen = document.createElement('canvas');
  const filter = filterId ? FILTER_PRESETS.find((f) => f.id === filterId) || null : null;

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
    filterIntensity,
    crop: { x: 0, y: 0, width: 1, height: 1 },
    rotation: 0,
    flipH: false,
    flipV: false,
    layers: [],
    maxDimension: 1000,
  });

  return offscreen;
}

export async function renderCreativeDesignToCanvas(
  canvas: HTMLCanvasElement,
  state: CreativeDesignState,
  fallbackSamples: string[]
) {
  const layoutPreset =
    PHOTO_LAYOUT_PRESETS.find((l) => l.id === state.layoutId) || PHOTO_LAYOUT_PRESETS[0];

  const baseW = 1080;
  const aspect = state.mode === 'scrapbook' ? 1 : layoutPreset.aspectRatio;
  const baseH = Math.round(baseW / aspect);

  canvas.width = baseW;
  canvas.height = baseH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Background
  await drawCreativeBackground(ctx, baseW, baseH, state.backgroundId, state.customBackgroundSrc);

  // Helper to get filtered drawable for a photo src
  const filterCache = new Map<string, HTMLCanvasElement | HTMLImageElement>();
  const resolvePhotoDrawable = async (src: string) => {
    if (filterCache.has(src)) return filterCache.get(src)!;
    const img = await loadHtmlImage(src);
    if (state.filterId && state.filterIntensity > 0) {
      const filteredCanvas = await applyFilterToImageElement(
        img,
        state.filterId,
        state.filterIntensity
      );
      filterCache.set(src, filteredCanvas);
      return filteredCanvas;
    }
    filterCache.set(src, img);
    return img;
  };

  // 2. Layout Photos (if mode === 'layout')
  if (state.mode === 'layout') {
    const frameInset = state.frameId === 'none' ? 16 : Math.round(Math.min(baseW, baseH) * 0.055);
    const slots = computeCreativeLayoutSlots(
      state.layoutId,
      baseW,
      baseH,
      state.layoutGap,
      frameInset
    );

    const shapeScale = clamp(state.shapeSize, 50, 100) / 100;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const src = state.layoutPhotos[i] || fallbackSamples[i % fallbackSamples.length];
      const sw = slot.w * shapeScale;
      const sh = slot.h * shapeScale;
      const cx = slot.x + slot.w / 2;
      const cy = slot.y + slot.h / 2;

      ctx.save();
      ctx.translate(cx, cy);
      if (slot.rotation) {
        ctx.rotate((slot.rotation * Math.PI) / 180);
      }

      // Polaroid card backing if layout slot specifies polaroidCaption or shape is polaroid-shape
      if (slot.polaroidCaption || state.shapeId === 'polaroid-shape') {
        drawRoundedRectPath(ctx, -sw / 2 - 10, -sh / 2 - 10, sw + 20, sh + 44, 6);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(45, 27, 40, 0.14)';
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      traceShapePath(ctx, state.shapeId, 0, 0, sw, sh, state.cornerRadius);
      ctx.save();
      ctx.clip();

      if (src) {
        try {
          const drawable = await resolvePhotoDrawable(src);
          const iw =
            drawable instanceof HTMLImageElement
              ? drawable.naturalWidth || drawable.width
              : drawable.width;
          const ih =
            drawable instanceof HTMLImageElement
              ? drawable.naturalHeight || drawable.height
              : drawable.height;
          const srcRatio = iw / ih;
          const dstRatio = sw / sh;
          let drawW = sw;
          let drawH = sh;
          if (srcRatio > dstRatio) {
            drawH = sh;
            drawW = sh * srcRatio;
          } else {
            drawW = sw;
            drawH = sw / srcRatio;
          }
          const zoomScale = clamp(state.photoZoom, 100, 220) / 100;
          drawW *= zoomScale;
          drawH *= zoomScale;
          const ox = (state.photoOffsetX / 100) * sw * 0.5;
          const oy = (state.photoOffsetY / 100) * sh * 0.5;
          ctx.drawImage(drawable, ox - drawW / 2, oy - drawH / 2, drawW, drawH);
        } catch {
          ctx.fillStyle = '#FCE7F3';
          ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
        }
      }
      ctx.restore();

      if (state.borderWidth > 0) {
        traceShapePath(ctx, state.shapeId, 0, 0, sw, sh, state.cornerRadius);
        ctx.strokeStyle = state.borderColor;
        ctx.lineWidth = state.borderWidth;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // 3. Draw Frame (in layout mode, frame wraps the photo slots behind top decorations; in scrapbook mode too)
  const theme = state.themeId ? THEME_PRESETS.find((t) => t.id === state.themeId) : null;
  drawCreativeFrame(
    ctx,
    baseW,
    baseH,
    state.frameId,
    state.frameCaption || theme?.badgeText || 'CAMCALL'
  );

  // 4. Layered Objects (Scrapbook Photos, Paper/Tape, Decorations, Text)
  for (const obj of state.objects) {
    if (obj.kind === 'paper-tape') {
      drawPaperTapeObject(ctx, obj, baseW, baseH);
      continue;
    }

    if (obj.kind === 'photo') {
      const cx = obj.x * baseW;
      const cy = obj.y * baseH;
      const pw = obj.width * baseW * obj.scale;
      const ph = obj.height * baseH * obj.scale;
      const shape = obj.shapeId || state.shapeId;

      ctx.save();
      ctx.globalAlpha = clamp(obj.opacity, 0, 1);
      ctx.translate(cx, cy);
      ctx.rotate((obj.rotation * Math.PI) / 180);

      if (shape === 'polaroid-shape') {
        drawRoundedRectPath(ctx, -pw / 2 - 12, -ph / 2 - 12, pw + 24, ph + 54, 6);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(45, 27, 40, 0.16)';
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      traceShapePath(ctx, shape, 0, 0, pw, ph, state.cornerRadius);
      ctx.save();
      ctx.clip();

      const src = obj.imageSrc || fallbackSamples[0];
      try {
        const drawable = await resolvePhotoDrawable(src);
        const iw =
          drawable instanceof HTMLImageElement
            ? drawable.naturalWidth || drawable.width
            : drawable.width;
        const ih =
          drawable instanceof HTMLImageElement
            ? drawable.naturalHeight || drawable.height
            : drawable.height;
        const srcRatio = iw / ih;
        const dstRatio = pw / ph;
        let dw = pw;
        let dh = ph;
        if (srcRatio > dstRatio) {
          dh = ph;
          dw = ph * srcRatio;
        } else {
          dw = pw;
          dh = pw / srcRatio;
        }
        ctx.drawImage(drawable, -dw / 2, -dh / 2, dw, dh);
      } catch {
        ctx.fillStyle = '#FCE7F3';
        ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      }
      ctx.restore();

      const bw = obj.borderWidth ?? state.borderWidth;
      if (bw > 0) {
        traceShapePath(ctx, shape, 0, 0, pw, ph, state.cornerRadius);
        ctx.strokeStyle = obj.borderColor || state.borderColor;
        ctx.lineWidth = bw;
        ctx.stroke();
      }

      ctx.restore();
      continue;
    }

    const cx = obj.x * baseW;
    const cy = obj.y * baseH;
    const baseSize = Math.min(baseW, baseH) * 0.1 * obj.scale;

    ctx.save();
    ctx.globalAlpha = clamp(obj.opacity, 0, 1);
    ctx.translate(cx, cy);
    ctx.rotate((obj.rotation * Math.PI) / 180);

    if (obj.kind === 'text') {
      const fontSize = Math.max(20, Math.round(baseSize * 0.56));
      ctx.font = `700 ${fontSize}px "${obj.fontFamily || 'Bricolage Grotesque'}", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const content = obj.text || obj.label || 'CAMCALL';
      if (obj.bgColor) {
        const metrics = ctx.measureText(content);
        const boxW = metrics.width + fontSize * 1.05;
        const boxH = fontSize * 1.65;
        ctx.fillStyle = obj.bgColor;
        drawRoundedRectPath(ctx, -boxW / 2, -boxH / 2, boxW, boxH, boxH / 2);
        ctx.fill();
      }
      ctx.fillStyle = obj.color;
      ctx.fillText(content, 0, 0);
    } else {
      drawVectorDecoration(ctx, obj, baseSize);
    }

    ctx.restore();
  }
}
