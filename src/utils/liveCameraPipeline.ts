import type {
  CameraEffectId,
  CameraOverlayId,
  FaceAnchorSet,
  FaceFilterId,
} from '../types/photobooth';
import type { FilterConfig } from '../types/studio';
import { clamp } from './imageProcessing';

let cachedScratchCanvas: HTMLCanvasElement | null = null;
function getScratchCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (!cachedScratchCanvas) {
    cachedScratchCanvas = document.createElement('canvas');
  }
  if (cachedScratchCanvas.width !== width || cachedScratchCanvas.height !== height) {
    cachedScratchCanvas.width = width;
    cachedScratchCanvas.height = height;
  }
  return cachedScratchCanvas;
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

function drawStarShape(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerR: number,
  innerR: number
) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawFourPointSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number
) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.24;
    const angle = (Math.PI / 4) * i;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawHeartShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.45);
  ctx.bezierCurveTo(cx - size * 0.85, cy - size * 0.05, cx - size * 0.65, cy - size * 0.72, cx, cy - size * 0.28);
  ctx.bezierCurveTo(cx + size * 0.65, cy - size * 0.72, cx + size * 0.85, cy - size * 0.05, cx, cy + size * 0.45);
  ctx.closePath();
}

function drawTinyFlower(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  petalColor: string,
  centerColor = '#FDE047'
) {
  ctx.save();
  ctx.fillStyle = petalColor;
  for (let i = 0; i < 5; i++) {
    const ang = (Math.PI * 2 * i) / 5;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(ang) * radius * 0.52, cy + Math.sin(ang) * radius * 0.52, radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = centerColor;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws all selected real-time Face AR filters onto the canvas anchored to face landmarks.
 */
export function drawFaceFiltersOnCanvas(
  ctx: CanvasRenderingContext2D,
  anchorsList: FaceAnchorSet[],
  activeFilters: FaceFilterId[],
  width: number,
  height: number,
  timeSec: number
) {
  if (activeFilters.length === 0 || anchorsList.length === 0) return;

  for (const face of anchorsList) {
    const pt = (p: { x: number; y: number }) => ({ x: p.x * width, y: p.y * height });
    const le = pt(face.leftEye);
    const re = pt(face.rightEye);
    const eyeMid = { x: (le.x + re.x) / 2, y: (le.y + re.y) / 2 };
    const forehead = pt(face.forehead);
    const lEar = pt(face.leftEar);
    const rEar = pt(face.rightEar);
    const nose = pt(face.noseTip);
    const lCheek = pt(face.leftCheek);
    const rCheek = pt(face.rightCheek);
    const mouth = pt(face.mouth);

    const eyeSpan = Math.max(24, Math.hypot(re.x - le.x, re.y - le.y));
    const headRoll = face.headAngle;

    // 1. EARS / HEADWEAR (rotated with headRoll around forehead/head top)
    const earCenter = {
      x: forehead.x,
      y: forehead.y - eyeSpan * 0.16,
    };

    if (activeFilters.includes('bunny-ears')) {
      ctx.save();
      ctx.translate(earCenter.x, earCenter.y);
      ctx.rotate(headRoll);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * eyeSpan * 0.52, -eyeSpan * 0.15);
        ctx.rotate(side * 0.14);
        ctx.fillStyle = '#FFFDFE';
        ctx.strokeStyle = '#F9A8D4';
        ctx.lineWidth = Math.max(2, eyeSpan * 0.04);
        ctx.beginPath();
        ctx.ellipse(0, -eyeSpan * 0.62, eyeSpan * 0.2, eyeSpan * 0.68, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FBCFE8';
        ctx.beginPath();
        ctx.ellipse(0, -eyeSpan * 0.6, eyeSpan * 0.1, eyeSpan * 0.46, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    if (activeFilters.includes('cat-ears')) {
      ctx.save();
      ctx.translate(earCenter.x, earCenter.y);
      ctx.rotate(headRoll);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * eyeSpan * 0.62, -eyeSpan * 0.04);
        ctx.rotate(side * 0.22);
        ctx.fillStyle = '#2D1B28';
        ctx.strokeStyle = '#F472B6';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-eyeSpan * 0.28, eyeSpan * 0.12);
        ctx.lineTo(0, -eyeSpan * 0.56);
        ctx.lineTo(eyeSpan * 0.28, eyeSpan * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#F9A8D4';
        ctx.beginPath();
        ctx.moveTo(-eyeSpan * 0.14, eyeSpan * 0.06);
        ctx.lineTo(0, -eyeSpan * 0.36);
        ctx.lineTo(eyeSpan * 0.14, eyeSpan * 0.06);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    if (activeFilters.includes('puppy-ears')) {
      ctx.save();
      ctx.translate(earCenter.x, earCenter.y + eyeSpan * 0.18);
      ctx.rotate(headRoll);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * eyeSpan * 0.92, 0);
        ctx.rotate(side * 0.32);
        ctx.fillStyle = '#C27849';
        ctx.strokeStyle = '#854D27';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, eyeSpan * 0.34, eyeSpan * 0.24, eyeSpan * 0.52, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    if (activeFilters.includes('bear-ears')) {
      ctx.save();
      ctx.translate(earCenter.x, earCenter.y);
      ctx.rotate(headRoll);
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#A1623B';
        ctx.strokeStyle = '#6B3E23';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(side * eyeSpan * 0.68, -eyeSpan * 0.1, eyeSpan * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#E6B89C';
        ctx.beginPath();
        ctx.arc(side * eyeSpan * 0.68, -eyeSpan * 0.1, eyeSpan * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (activeFilters.includes('deer-ears')) {
      ctx.save();
      ctx.translate(earCenter.x, earCenter.y);
      ctx.rotate(headRoll);
      for (const side of [-1, 1]) {
        // Antlers
        ctx.strokeStyle = '#8B5A2B';
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(3, eyeSpan * 0.065);
        ctx.beginPath();
        ctx.moveTo(side * eyeSpan * 0.42, 0);
        ctx.lineTo(side * eyeSpan * 0.68, -eyeSpan * 0.72);
        ctx.moveTo(side * eyeSpan * 0.55, -eyeSpan * 0.35);
        ctx.lineTo(side * eyeSpan * 0.36, -eyeSpan * 0.64);
        ctx.moveTo(side * eyeSpan * 0.61, -eyeSpan * 0.52);
        ctx.lineTo(side * eyeSpan * 0.85, -eyeSpan * 0.6);
        ctx.stroke();
        // Ears
        ctx.fillStyle = '#C88D55';
        ctx.beginPath();
        ctx.ellipse(side * eyeSpan * 0.85, -eyeSpan * 0.02, eyeSpan * 0.24, eyeSpan * 0.13, side * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (activeFilters.includes('fox-ears')) {
      ctx.save();
      ctx.translate(earCenter.x, earCenter.y);
      ctx.rotate(headRoll);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * eyeSpan * 0.66, -eyeSpan * 0.05);
        ctx.rotate(side * 0.28);
        ctx.fillStyle = '#EA580C';
        ctx.beginPath();
        ctx.moveTo(-eyeSpan * 0.28, eyeSpan * 0.12);
        ctx.lineTo(0, -eyeSpan * 0.64);
        ctx.lineTo(eyeSpan * 0.28, eyeSpan * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFFBEB';
        ctx.beginPath();
        ctx.moveTo(-eyeSpan * 0.14, eyeSpan * 0.06);
        ctx.lineTo(0, -eyeSpan * 0.44);
        ctx.lineTo(eyeSpan * 0.14, eyeSpan * 0.06);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    if (activeFilters.includes('flower-crown')) {
      ctx.save();
      ctx.translate(forehead.x, forehead.y + eyeSpan * 0.05);
      ctx.rotate(headRoll);
      const colors = ['#F472B6', '#FBBF24', '#C084FC', '#FB7185', '#F472B6'];
      for (let i = -2; i <= 2; i++) {
        const fx = i * eyeSpan * 0.38;
        const fy = Math.abs(i) * eyeSpan * 0.07;
        drawTinyFlower(ctx, fx, fy, eyeSpan * 0.18, colors[i + 2]);
      }
      ctx.restore();
    }

    if (activeFilters.includes('angel-halo')) {
      ctx.save();
      ctx.translate(forehead.x, forehead.y - eyeSpan * 0.48 + Math.sin(timeSec * 3) * 3);
      ctx.rotate(headRoll);
      ctx.strokeStyle = '#FDE047';
      ctx.shadowColor = '#FEF08A';
      ctx.shadowBlur = 16;
      ctx.lineWidth = Math.max(4, eyeSpan * 0.08);
      ctx.beginPath();
      ctx.ellipse(0, 0, eyeSpan * 0.64, eyeSpan * 0.16, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (activeFilters.includes('princess-crown')) {
      ctx.save();
      ctx.translate(forehead.x, forehead.y - eyeSpan * 0.16);
      ctx.rotate(headRoll);
      const w = eyeSpan * 0.92;
      const h = eyeSpan * 0.52;
      ctx.fillStyle = '#FBBF24';
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(-w * 0.44, -h * 0.72);
      ctx.lineTo(-w * 0.18, -h * 0.32);
      ctx.lineTo(0, -h);
      ctx.lineTo(w * 0.18, -h * 0.32);
      ctx.lineTo(w * 0.44, -h * 0.72);
      ctx.lineTo(w / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#EC4899';
      ctx.beginPath();
      ctx.arc(0, -h * 0.42, eyeSpan * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. CHEEK & SKIN CUTE FILTERS
    if (activeFilters.includes('pink-blush') || activeFilters.includes('makeup-filter')) {
      for (const c of [lCheek, rCheek]) {
        const rad = eyeSpan * 0.36;
        const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, rad);
        grad.addColorStop(0, 'rgba(244, 114, 182, 0.52)');
        grad.addColorStop(1, 'rgba(244, 114, 182, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(c.x, c.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (activeFilters.includes('heart-cheeks')) {
      ctx.save();
      ctx.fillStyle = '#EC4899';
      for (const c of [lCheek, rCheek]) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(headRoll);
        drawHeartShape(ctx, 0, 0, eyeSpan * 0.22);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    if (activeFilters.includes('freckles')) {
      ctx.save();
      ctx.fillStyle = 'rgba(146, 86, 52, 0.65)';
      const offsets = [
        [-0.22, -0.04],
        [-0.08, 0.02],
        [0.06, -0.05],
        [0.18, 0.03],
        [-0.14, 0.08],
      ];
      for (const c of [lCheek, rCheek]) {
        for (const [ox, oy] of offsets) {
          ctx.beginPath();
          ctx.arc(c.x + ox * eyeSpan, c.y + oy * eyeSpan, Math.max(1.5, eyeSpan * 0.02), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    if (activeFilters.includes('pink-nose')) {
      ctx.save();
      ctx.fillStyle = '#FB7185';
      ctx.beginPath();
      ctx.ellipse(nose.x, nose.y, eyeSpan * 0.14, eyeSpan * 0.1, headRoll, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.beginPath();
      ctx.arc(nose.x - eyeSpan * 0.04, nose.y - eyeSpan * 0.03, eyeSpan * 0.035, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (activeFilters.includes('cute-whiskers')) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = Math.max(2, eyeSpan * 0.03);
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const base = side === -1 ? lCheek : rCheek;
        for (const ang of [-0.18, 0, 0.18]) {
          ctx.beginPath();
          ctx.moveTo(base.x - side * eyeSpan * 0.08, base.y);
          ctx.lineTo(
            base.x + side * eyeSpan * 0.48,
            base.y + Math.sin(ang) * eyeSpan * 0.35
          );
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 3. EYES / GLASSES / MAKEUP
    if (activeFilters.includes('makeup-filter')) {
      ctx.save();
      ctx.strokeStyle = '#2D1B28';
      ctx.lineWidth = Math.max(2, eyeSpan * 0.03);
      ctx.lineCap = 'round';
      for (const [eye, dir] of [
        [le, -1],
        [re, 1],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(eye.x - dir * eyeSpan * 0.12, eye.y - eyeSpan * 0.08);
        ctx.quadraticCurveTo(
          eye.x + dir * eyeSpan * 0.16,
          eye.y - eyeSpan * 0.14,
          eye.x + dir * eyeSpan * 0.25,
          eye.y - eyeSpan * 0.18
        );
        ctx.stroke();
      }
      ctx.restore();
    }

    if (activeFilters.includes('lip-tint') || activeFilters.includes('makeup-filter')) {
      ctx.save();
      ctx.translate(mouth.x, mouth.y);
      ctx.rotate(headRoll);
      ctx.fillStyle = 'rgba(225, 29, 72, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 0, eyeSpan * 0.26, eyeSpan * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (activeFilters.includes('sunglasses')) {
      ctx.save();
      ctx.translate(eyeMid.x, eyeMid.y);
      ctx.rotate(headRoll);
      ctx.fillStyle = 'rgba(24, 24, 27, 0.88)';
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 2.5;
      for (const side of [-1, 1]) {
        drawRoundedRectPath(
          ctx,
          side * eyeSpan * 0.5 - eyeSpan * 0.34,
          -eyeSpan * 0.2,
          eyeSpan * 0.68,
          eyeSpan * 0.42,
          eyeSpan * 0.12
        );
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-eyeSpan * 0.16, -eyeSpan * 0.04);
      ctx.lineTo(eyeSpan * 0.16, -eyeSpan * 0.04);
      ctx.stroke();
      ctx.restore();
    }

    if (activeFilters.includes('pink-glasses')) {
      ctx.save();
      ctx.translate(eyeMid.x, eyeMid.y);
      ctx.rotate(headRoll);
      ctx.fillStyle = 'rgba(244, 114, 182, 0.38)';
      ctx.strokeStyle = '#EC4899';
      ctx.lineWidth = 3;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(side * eyeSpan * 0.5, 0, eyeSpan * 0.33, eyeSpan * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-eyeSpan * 0.17, 0);
      ctx.lineTo(eyeSpan * 0.17, 0);
      ctx.stroke();
      ctx.restore();
    }

    if (activeFilters.includes('star-glasses')) {
      ctx.save();
      ctx.translate(eyeMid.x, eyeMid.y);
      ctx.rotate(headRoll);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.35)';
      ctx.strokeStyle = '#A855F7';
      ctx.lineWidth = 2.5;
      for (const side of [-1, 1]) {
        drawStarShape(ctx, side * eyeSpan * 0.5, 0, 5, eyeSpan * 0.38, eyeSpan * 0.18);
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-eyeSpan * 0.2, 0);
      ctx.lineTo(eyeSpan * 0.2, 0);
      ctx.stroke();
      ctx.restore();
    }

    if (activeFilters.includes('butterfly-glasses')) {
      ctx.save();
      ctx.translate(eyeMid.x, eyeMid.y);
      ctx.rotate(headRoll);
      ctx.fillStyle = 'rgba(236, 72, 153, 0.34)';
      ctx.strokeStyle = '#DB2777';
      ctx.lineWidth = 2.5;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * eyeSpan * 0.18, 0);
        ctx.bezierCurveTo(side * eyeSpan * 0.25, -eyeSpan * 0.36, side * eyeSpan * 0.95, -eyeSpan * 0.34, side * eyeSpan * 0.84, 0);
        ctx.bezierCurveTo(side * eyeSpan * 0.78, eyeSpan * 0.3, side * eyeSpan * 0.3, eyeSpan * 0.26, side * eyeSpan * 0.18, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. FUN FILTERS
    if (activeFilters.includes('funny-mustache')) {
      ctx.save();
      ctx.translate(mouth.x, mouth.y - eyeSpan * 0.16);
      ctx.rotate(headRoll);
      ctx.fillStyle = '#27272A';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          side * eyeSpan * 0.16,
          -eyeSpan * 0.14,
          side * eyeSpan * 0.42,
          eyeSpan * 0.08,
          side * eyeSpan * 0.48,
          -eyeSpan * 0.08
        );
        ctx.bezierCurveTo(
          side * eyeSpan * 0.44,
          eyeSpan * 0.2,
          side * eyeSpan * 0.12,
          eyeSpan * 0.14,
          0,
          eyeSpan * 0.06
        );
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    if (activeFilters.includes('big-glasses')) {
      ctx.save();
      ctx.translate(eyeMid.x, eyeMid.y);
      ctx.rotate(headRoll);
      ctx.strokeStyle = '#4F46E5';
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = Math.max(4, eyeSpan * 0.06);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * eyeSpan * 0.5, 0, eyeSpan * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-eyeSpan * 0.08, 0);
      ctx.lineTo(eyeSpan * 0.08, 0);
      ctx.stroke();
      ctx.restore();
    }

    if (activeFilters.includes('cartoon-face')) {
      ctx.save();
      // Giant glossy anime eyes + rosy circles
      for (const eye of [le, re]) {
        ctx.fillStyle = '#1E1B4B';
        ctx.beginPath();
        ctx.arc(eye.x, eye.y, eyeSpan * 0.19, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(eye.x - eyeSpan * 0.05, eye.y - eyeSpan * 0.06, eyeSpan * 0.065, 0, Math.PI * 2);
        ctx.arc(eye.x + eyeSpan * 0.05, eye.y + eyeSpan * 0.05, eyeSpan * 0.03, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const c of [lCheek, rCheek]) {
        ctx.fillStyle = 'rgba(244, 114, 182, 0.5)';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, eyeSpan * 0.22, eyeSpan * 0.12, headRoll, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (activeFilters.includes('rainbow-face')) {
      ctx.save();
      ctx.translate(mouth.x, mouth.y);
      ctx.rotate(headRoll);
      const stripes = ['#FB7185', '#FBBF24', '#4ADE80', '#38BDF8', '#C084FC'];
      const stripW = eyeSpan * 0.095;
      const startX = -(stripes.length * stripW) / 2;
      const streamH = eyeSpan * (1.2 + Math.sin(timeSec * 5) * 0.12);
      stripes.forEach((col, i) => {
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(startX + i * stripW, 0, stripW + 0.5, streamH);
      });
      ctx.restore();
    }

    if (activeFilters.includes('star-eyes')) {
      ctx.save();
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#CA8A04';
      ctx.lineWidth = 1.8;
      for (const eye of [le, re]) {
        ctx.save();
        ctx.translate(eye.x, eye.y);
        ctx.rotate(timeSec * 1.4);
        drawStarShape(ctx, 0, 0, 5, eyeSpan * 0.24, eyeSpan * 0.11);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    // Subtle temple ear sparkles when any ear filter is active
    if (lEar.x > 0 && rEar.x > 0 && activeFilters.includes('fairy' as FaceFilterId)) {
      // unused sentinel
    }
  }
}

/**
 * Draws animated real-time camera overlays (Floating Hearts, Stars, Sparkles, Flowers, Butterflies, Bubbles, Clouds, Glitter Rain, Ribbons).
 */
export function drawCameraOverlaysOnCanvas(
  ctx: CanvasRenderingContext2D,
  overlays: CameraOverlayId[],
  width: number,
  height: number,
  timeSec: number
) {
  if (overlays.length === 0) return;

  for (const ov of overlays) {
    ctx.save();
    switch (ov) {
      case 'floating-hearts': {
        for (let i = 0; i < 12; i++) {
          const x = ((i * 0.19 + 0.08) % 1) * width + Math.sin(timeSec * 1.4 + i) * 14;
          const y = (1 - ((timeSec * 0.14 + i * 0.11) % 1)) * height;
          ctx.globalAlpha = 0.72;
          ctx.fillStyle = i % 2 === 0 ? '#EC4899' : '#F472B6';
          drawHeartShape(ctx, x, y, 16 + (i % 3) * 6);
          ctx.fill();
        }
        break;
      }
      case 'floating-stars': {
        for (let i = 0; i < 14; i++) {
          const x = ((i * 0.23 + 0.05) % 1) * width;
          const y = ((i * 0.17 + 0.12) % 1) * height + Math.sin(timeSec * 1.8 + i) * 10;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(timeSec * 0.8 + i);
          ctx.globalAlpha = 0.45 + 0.4 * Math.sin(timeSec * 3 + i);
          ctx.fillStyle = i % 2 === 0 ? '#FACC15' : '#F9A8D4';
          drawStarShape(ctx, 0, 0, 5, 11 + (i % 3) * 3, 5);
          ctx.fill();
          ctx.restore();
        }
        break;
      }
      case 'pink-sparkles': {
        for (let i = 0; i < 18; i++) {
          const x = ((i * 0.13 + 0.07) % 1) * width;
          const y = ((i * 0.29 + 0.04) % 1) * height;
          const pulse = 0.4 + 0.6 * Math.abs(Math.sin(timeSec * 3.2 + i * 0.9));
          ctx.fillStyle = i % 2 === 0 ? '#F472B6' : '#FFFFFF';
          ctx.globalAlpha = pulse * 0.85;
          drawFourPointSparkle(ctx, x, y, (8 + (i % 3) * 4) * pulse);
          ctx.fill();
        }
        break;
      }
      case 'falling-flowers': {
        for (let i = 0; i < 10; i++) {
          const x = ((i * 0.21 + 0.1) % 1) * width + Math.sin(timeSec + i) * 20;
          const y = ((timeSec * 0.12 + i * 0.13) % 1) * height;
          drawTinyFlower(ctx, x, y, 11 + (i % 3) * 3, i % 2 === 0 ? '#F9A8D4' : '#FBCFE8');
        }
        break;
      }
      case 'butterflies': {
        for (let i = 0; i < 6; i++) {
          const x = ((i * 0.22 + 0.1 + Math.sin(timeSec * 0.9 + i) * 0.08) % 1) * width;
          const y = ((i * 0.18 + 0.14 + Math.cos(timeSec * 1.1 + i) * 0.06) % 1) * height;
          const flap = 0.55 + 0.45 * Math.abs(Math.sin(timeSec * 7 + i));
          ctx.save();
          ctx.translate(x, y);
          ctx.fillStyle = i % 2 === 0 ? 'rgba(244,114,182,0.85)' : 'rgba(192,132,252,0.85)';
          ctx.beginPath();
          ctx.ellipse(-7 * flap, -3, 9 * flap, 6, -0.4, 0, Math.PI * 2);
          ctx.ellipse(7 * flap, -3, 9 * flap, 6, 0.4, 0, Math.PI * 2);
          ctx.ellipse(-5 * flap, 5, 6 * flap, 4.5, 0.3, 0, Math.PI * 2);
          ctx.ellipse(5 * flap, 5, 6 * flap, 4.5, -0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        break;
      }
      case 'floating-bubbles': {
        for (let i = 0; i < 12; i++) {
          const x = ((i * 0.17 + 0.08) % 1) * width + Math.sin(timeSec + i) * 12;
          const y = (1 - ((timeSec * 0.11 + i * 0.14) % 1)) * height;
          const r = 10 + (i % 4) * 5;
          ctx.strokeStyle = 'rgba(255,255,255,0.72)';
          ctx.fillStyle = 'rgba(219, 234, 254, 0.18)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.beginPath();
          ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.18, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'cute-clouds': {
        const positions = [
          [0.14, 0.12],
          [0.84, 0.14],
          [0.16, 0.86],
          [0.82, 0.84],
        ];
        ctx.fillStyle = 'rgba(255,255,255,0.82)';
        positions.forEach(([px, py], i) => {
          const cx = px * width + Math.sin(timeSec * 0.7 + i) * 10;
          const cy = py * height;
          ctx.beginPath();
          ctx.arc(cx - 18, cy + 4, 14, 0, Math.PI * 2);
          ctx.arc(cx, cy - 6, 18, 0, Math.PI * 2);
          ctx.arc(cx + 18, cy + 4, 14, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
      }
      case 'glitter-rain': {
        for (let i = 0; i < 36; i++) {
          const x = ((i * 0.097 + 0.03) % 1) * width;
          const y = ((timeSec * (0.24 + (i % 4) * 0.05) + i * 0.19) % 1) * height;
          ctx.fillStyle = i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? '#F9A8D4' : '#DDD6FE';
          ctx.globalAlpha = 0.78;
          ctx.beginPath();
          ctx.arc(x, y, 2.5 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'animated-ribbons': {
        ctx.strokeStyle = '#F472B6';
        ctx.lineWidth = 5;
        ctx.globalAlpha = 0.72;
        for (const [bx, by] of [
          [0.12, 0.1],
          [0.88, 0.1],
        ]) {
          const cx = bx * width;
          const cy = by * height + Math.sin(timeSec * 2) * 5;
          ctx.fillStyle = '#F472B6';
          ctx.beginPath();
          ctx.ellipse(cx - 14, cy, 14, 9, -0.35, 0, Math.PI * 2);
          ctx.ellipse(cx + 14, cy, 14, 9, 0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#BE185D';
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
    }
    ctx.restore();
  }
}

/**
 * Applies all 18 real-time camera effects directly onto the live canvas.
 */
export function applyLiveCameraEffects(
  ctx: CanvasRenderingContext2D,
  effects: CameraEffectId[],
  width: number,
  height: number,
  timeSec: number,
  prevFrameCanvas?: HTMLCanvasElement | null
) {
  if (effects.length === 0) return;

  // Motion Blur blending with previous frame
  if (effects.includes('motion-blur') && prevFrameCanvas && prevFrameCanvas.width === width) {
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.drawImage(prevFrameCanvas, 0, 0, width, height);
    ctx.restore();
  }

  // Dreamy Blur / Soft Glow bloom pass (copy to scratch canvas first for cross-browser safety)
  if (effects.includes('dreamy-blur') || effects.includes('soft-glow')) {
    const scratch = getScratchCanvas(width, height);
    const sctx = scratch?.getContext('2d');
    if (scratch && sctx) {
      sctx.clearRect(0, 0, width, height);
      sctx.drawImage(ctx.canvas, 0, 0);
      ctx.save();
      ctx.globalAlpha = effects.includes('dreamy-blur') ? 0.36 : 0.25;
      ctx.globalCompositeOperation = 'screen';
      ctx.filter = effects.includes('dreamy-blur') ? 'blur(8px)' : 'blur(4px)';
      ctx.drawImage(scratch, 0, 0);
      ctx.restore();
    }
  }

  // RGB Split / Chromatic Aberration channel shift
  if (effects.includes('rgb-split') || effects.includes('chromatic-aberration')) {
    const offset = effects.includes('rgb-split') ? 6 : 3;
    const imgData = ctx.getImageData(0, 0, width, height);
    const src = new Uint8ClampedArray(imgData.data);
    const dst = imgData.data;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const rx = clamp(x - offset, 0, width - 1);
        const bx = clamp(x + offset, 0, width - 1);
        dst[idx] = src[(y * width + rx) * 4];
        dst[idx + 2] = src[(y * width + bx) * 4 + 2];
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // Retro Digital subtle pixelation
  if (effects.includes('retro-digital')) {
    const scale = 0.32;
    const smallW = Math.max(40, Math.round(width * scale));
    const smallH = Math.max(40, Math.round(height * scale));
    const temp = getScratchCanvas(smallW, smallH);
    const tctx = temp?.getContext('2d');
    if (temp && tctx) {
      tctx.clearRect(0, 0, smallW, smallH);
      tctx.drawImage(ctx.canvas, 0, 0, smallW, smallH);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(temp, 0, 0, width, height);
      ctx.restore();
    }
  }

  // Old Camera Effect (warm sepia wash + dust scratches + dark edges)
  if (effects.includes('old-camera')) {
    ctx.save();
    ctx.fillStyle = 'rgba(138, 92, 52, 0.22)';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255, 245, 225, 0.28)';
    ctx.lineWidth = 1;
    const scratchX = ((timeSec * 73) % 1) * width;
    ctx.beginPath();
    ctx.moveTo(scratchX, 0);
    ctx.lineTo(scratchX + 2, height);
    ctx.stroke();
    ctx.restore();
  }

  // Pink Glow wash
  if (effects.includes('pink-glow')) {
    ctx.save();
    const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.1, width / 2, height / 2, width * 0.72);
    grad.addColorStop(0, 'rgba(251, 207, 232, 0.18)');
    grad.addColorStop(1, 'rgba(244, 114, 182, 0.28)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Rainbow Light prism wash
  if (effects.includes('rainbow-light')) {
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, 'rgba(251, 113, 133, 0.22)');
    grad.addColorStop(0.28, 'rgba(253, 224, 71, 0.18)');
    grad.addColorStop(0.55, 'rgba(74, 222, 128, 0.16)');
    grad.addColorStop(0.78, 'rgba(96, 165, 250, 0.20)');
    grad.addColorStop(1, 'rgba(192, 132, 252, 0.24)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Light Leak warm film edge
  if (effects.includes('light-leak')) {
    ctx.save();
    const grad = ctx.createRadialGradient(width * 0.08, height * 0.25, 10, width * 0.15, height * 0.35, width * 0.65);
    grad.addColorStop(0, 'rgba(251, 146, 60, 0.48)');
    grad.addColorStop(0.45, 'rgba(244, 63, 94, 0.25)');
    grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Lens Flare sun rings
  if (effects.includes('lens-flare')) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const fx = width * 0.22 + Math.sin(timeSec * 0.8) * 14;
    const fy = height * 0.22;
    const mainGrad = ctx.createRadialGradient(fx, fy, 4, fx, fy, width * 0.26);
    mainGrad.addColorStop(0, 'rgba(255, 255, 240, 0.72)');
    mainGrad.addColorStop(0.3, 'rgba(253, 186, 116, 0.35)');
    mainGrad.addColorStop(1, 'rgba(253, 186, 116, 0)');
    ctx.fillStyle = mainGrad;
    ctx.fillRect(0, 0, width, height);

    for (let i = 1; i <= 3; i++) {
      ctx.fillStyle = i === 2 ? 'rgba(244, 114, 182, 0.24)' : 'rgba(165, 243, 252, 0.22)';
      ctx.beginPath();
      ctx.arc(fx + i * width * 0.16, fy + i * height * 0.14, 14 + i * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Vintage Flash harsh center highlight + dark edge vignette
  if (effects.includes('vintage-flash') || effects.includes('old-camera')) {
    ctx.save();
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.hypot(cx, cy);
    const vig = ctx.createRadialGradient(cx, cy, r * 0.32, cx, cy, r);
    vig.addColorStop(0, effects.includes('vintage-flash') ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(18, 10, 16, 0.56)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Film Grain
  if (effects.includes('film-grain') || effects.includes('old-camera')) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let i = 0; i < 240; i++) {
      const gx = ((Math.sin(i * 12.9898 + timeSec * 19.3) * 43758.5453) % 1 + 1) % 1;
      const gy = ((Math.sin(i * 78.233 + timeSec * 13.7) * 28411.1234) % 1 + 1) % 1;
      ctx.fillRect(gx * width, gy * height, 2, 2);
    }
    ctx.restore();
  }

  // Sparkle / Glitter / Star Shine
  if (effects.includes('sparkle') || effects.includes('glitter') || effects.includes('star-shine')) {
    ctx.save();
    const count = effects.includes('glitter') ? 28 : 12;
    for (let i = 0; i < count; i++) {
      const sx = ((i * 0.173 + 0.07) % 1) * width;
      const sy = ((i * 0.271 + 0.09) % 1) * height;
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(timeSec * 3.5 + i));
      ctx.globalAlpha = pulse;
      ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#F9A8D4';
      if (effects.includes('star-shine') && i % 3 === 0) {
        drawFourPointSparkle(ctx, sx, sy, 16 * pulse);
      } else {
        drawFourPointSparkle(ctx, sx, sy, 8 * pulse);
      }
      ctx.fill();
    }
    ctx.restore();
  }

  // VHS scanlines & PLAY HUD
  if (effects.includes('vhs')) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 1.5);
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${Math.max(14, Math.round(width * 0.028))}px "JetBrains Mono", monospace`;
    ctx.fillText('▶ PLAY', 18, 32);
    ctx.fillText('SP · VHS', width - 110, 32);
    ctx.restore();
  }

  // Timestamp Camera HUD
  if (effects.includes('timestamp')) {
    ctx.save();
    const now = new Date();
    const stamp = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}  ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const fontSize = Math.max(15, Math.round(width * 0.032));
    ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#FB923C';
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 4;
    ctx.textAlign = 'right';
    ctx.fillText(stamp, width - 18, height - 18);
    ctx.restore();
  }
}

export interface LiveRenderOptions {
  aspectRatio: number;
  mirror: boolean;
  zoom: number;
  filter: FilterConfig | null;
  activeEffects: CameraEffectId[];
  activeFaceFilters: FaceFilterId[];
  activeOverlays: CameraOverlayId[];
  anchors: FaceAnchorSet[];
  timeSec: number;
  prevFrameCanvas?: HTMLCanvasElement | null;
}

export function prepareCleanTrackingCanvas(
  trackingCanvas: HTMLCanvasElement,
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  aspectRatio: number,
  mirror: boolean,
  zoom: number
): boolean {
  const srcW =
    source instanceof HTMLVideoElement
      ? source.videoWidth
      : source instanceof HTMLImageElement
        ? source.naturalWidth || source.width
        : source.width;
  const srcH =
    source instanceof HTMLVideoElement
      ? source.videoHeight
      : source instanceof HTMLImageElement
        ? source.naturalHeight || source.height
        : source.height;

  if (!srcW || !srcH) return false;

  const baseW = 480;
  const outW = aspectRatio >= 1 ? baseW : Math.round(baseW * aspectRatio);
  const outH = aspectRatio >= 1 ? Math.round(baseW / aspectRatio) : baseW;

  if (trackingCanvas.width !== outW || trackingCanvas.height !== outH) {
    trackingCanvas.width = outW;
    trackingCanvas.height = outH;
  }

  const ctx = trackingCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;

  const srcRatio = srcW / srcH;
  let cropW = srcW;
  let cropH = srcH;
  if (srcRatio > aspectRatio) {
    cropW = srcH * aspectRatio;
  } else {
    cropH = srcW / aspectRatio;
  }

  const safeZoom = clamp(zoom, 1, 2.5);
  const zoomedW = cropW / safeZoom;
  const zoomedH = cropH / safeZoom;
  const sx = (srcW - zoomedW) / 2;
  const sy = (srcH - zoomedH) / 2;

  ctx.save();
  if (mirror) {
    ctx.translate(outW, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, sx, sy, zoomedW, zoomedH, 0, 0, outW, outH);
  ctx.restore();
  return true;
}

/**
 * Renders one live frame from either a MediaStream <video> or a demo portrait <canvas>/<img>
 * with zoom, mirror, aspect crop, color filter, real-time camera effects, Face AR, and overlays.
 */
export function renderLiveCameraFrame(
  targetCanvas: HTMLCanvasElement,
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  options: LiveRenderOptions
) {
  const {
    aspectRatio,
    mirror,
    zoom,
    filter,
    activeEffects,
    activeFaceFilters,
    activeOverlays,
    anchors,
    timeSec,
    prevFrameCanvas,
  } = options;

  const srcW =
    source instanceof HTMLVideoElement
      ? source.videoWidth
      : source instanceof HTMLImageElement
        ? source.naturalWidth || source.width
        : source.width;
  const srcH =
    source instanceof HTMLVideoElement
      ? source.videoHeight
      : source instanceof HTMLImageElement
        ? source.naturalHeight || source.height
        : source.height;

  if (!srcW || !srcH) return;

  const baseW = 720;
  const outW = aspectRatio >= 1 ? baseW : Math.round(baseW * aspectRatio);
  const outH = aspectRatio >= 1 ? Math.round(baseW / aspectRatio) : baseW;

  if (targetCanvas.width !== outW || targetCanvas.height !== outH) {
    targetCanvas.width = outW;
    targetCanvas.height = outH;
  }

  const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const srcRatio = srcW / srcH;
  let cropW = srcW;
  let cropH = srcH;
  if (srcRatio > aspectRatio) {
    cropW = srcH * aspectRatio;
  } else {
    cropH = srcW / aspectRatio;
  }

  const safeZoom = clamp(zoom, 1, 2.5);
  const zoomedW = cropW / safeZoom;
  const zoomedH = cropH / safeZoom;
  const sx = (srcW - zoomedW) / 2;
  const sy = (srcH - zoomedH) / 2;

  ctx.save();
  if (filter) {
    ctx.filter = `brightness(${filter.brightness}) contrast(${filter.contrast}) saturate(${filter.saturation}) sepia(${filter.sepia}) hue-rotate(${filter.hueRotate}deg)`;
  } else {
    ctx.filter = 'none';
  }
  if (mirror) {
    ctx.translate(outW, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, sx, sy, zoomedW, zoomedH, 0, 0, outW, outH);
  ctx.restore();

  // Subtle pink/lavender studio tint from FilterConfig
  if (filter && (filter.pinkTint > 0.02 || filter.lavenderTint > 0.02)) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    if (filter.pinkTint > 0.02) {
      ctx.fillStyle = `rgba(244, 114, 182, ${clamp(filter.pinkTint * 0.8, 0, 0.35)})`;
      ctx.fillRect(0, 0, outW, outH);
    }
    if (filter.lavenderTint > 0.02) {
      ctx.fillStyle = `rgba(167, 139, 250, ${clamp(filter.lavenderTint * 0.8, 0, 0.35)})`;
      ctx.fillRect(0, 0, outW, outH);
    }
    ctx.restore();
  }

  // Real-time Camera Effects
  applyLiveCameraEffects(ctx, activeEffects, outW, outH, timeSec, prevFrameCanvas);

  // Real-time Face AR Filters
  drawFaceFiltersOnCanvas(ctx, anchors, activeFaceFilters, outW, outH, timeSec);

  // Real-time Camera Overlays
  drawCameraOverlaysOnCanvas(ctx, activeOverlays, outW, outH, timeSec);

  // Store previous frame for motion blur
  if (prevFrameCanvas) {
    if (prevFrameCanvas.width !== outW || prevFrameCanvas.height !== outH) {
      prevFrameCanvas.width = outW;
      prevFrameCanvas.height = outH;
    }
    const pctx = prevFrameCanvas.getContext('2d');
    pctx?.drawImage(targetCanvas, 0, 0);
  }
}
