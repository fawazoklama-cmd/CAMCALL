import {
  Calendar,
  Camera,
  Download,
  Film,
  FolderHeart,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Newspaper,
  Play,
  Save,
  Smartphone,
  Sparkles,
  Square,
  Upload,
  UserCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { STUDIO_SAMPLE_PHOTOS } from '../data/sampleMedia';
import type { LocalProjectRecord } from '../types/settings';
import { loadHtmlImage } from '../utils/canvasRenderer';
import { encodeCanvasesToGifBlob } from '../utils/gifEncoder';
import { recordHistoryDb, savePhotoToDb, saveProjectToDb } from '../utils/localDb';
import { CamcallLogo } from './CamcallLogo';
import { LiveCameraCaptureModal } from './LiveCameraCaptureModal';
import type { CreativeModeId } from './Navbar';

interface CreativeStudioModesProps {
  initialMode?: CreativeModeId;
  initialProject?: LocalProjectRecord | null;
  onOpenScrapbookStudio: () => void;
  onNotify: (msg: string, kind?: 'success' | 'info') => void;
}

const MODE_LIST: { id: CreativeModeId; Icon: typeof Sparkles }[] = [
  { id: 'polaroid', Icon: ImageIcon },
  { id: 'photocard', Icon: Sparkles },
  { id: 'magazine', Icon: Newspaper },
  { id: 'moodboard', Icon: LayoutTemplate },
  { id: 'pfp', Icon: UserCircle },
  { id: 'wallpaper', Icon: Smartphone },
  { id: 'calendar', Icon: Calendar },
  { id: 'journal', Icon: Layers },
  { id: 'gif', Icon: Film },
  { id: 'slideshow', Icon: Play },
  { id: 'idcard', Icon: FolderHeart },
  { id: 'scrapbook', Icon: Square },
];

const PALETTE_THEMES = [
  { id: 'pink', label: 'Baby Pink', bg: '#FDF2F8', card: '#FFFFFF', accent: '#DB2777', ink: '#2D1B28', border: '#F472B6' },
  { id: 'lavender', label: 'Soft Lavender', bg: '#F3F0FF', card: '#FFFFFF', accent: '#7C3AED', ink: '#231936', border: '#A78BFA' },
  { id: 'cream', label: 'Warm Cream', bg: '#FFFBF3', card: '#FFFFFF', accent: '#BE185D', ink: '#3B2F2F', border: '#E7C6A5' },
  { id: 'minimal', label: 'Minimal White', bg: '#F8FAFC', card: '#FFFFFF', accent: '#0F172A', ink: '#0F172A', border: '#CBD5E1' },
  { id: 'dark', label: 'Midnight Pink', bg: '#1D1520', card: '#2A1E2F', accent: '#F472B6', ink: '#FDF2F8', border: '#7C3AED' },
];

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const ir = img.naturalWidth / Math.max(1, img.naturalHeight);
  const tr = dw / Math.max(1, dh);
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (ir > tr) {
    sw = img.naturalHeight * tr;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / tr;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function CreativeStudioModes({
  initialMode = 'polaroid',
  initialProject,
  onOpenScrapbookStudio,
  onNotify,
}: CreativeStudioModesProps) {
  const { t, lang } = useSettings();

  const [mode, setMode] = useState<CreativeModeId>(initialMode);
  const [themeIndex, setThemeIndex] = useState<number>(0);
  const [photos, setPhotos] = useState<string[]>([
    STUDIO_SAMPLE_PHOTOS[0].src,
    STUDIO_SAMPLE_PHOTOS[1].src,
    STUDIO_SAMPLE_PHOTOS[2].src,
    STUDIO_SAMPLE_PHOTOS[3].src,
  ]);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  // Mode-specific fields
  const [headline, setHeadline] = useState('CAMCALL STUDIO');
  const [subtitle, setSubtitle] = useState('Your Moments, Your Style ♡');
  const [caption, setCaption] = useState('Seoul Dreamy Afternoon · 2026');
  const [badgeText, setBadgeText] = useState('ISSUE #08 · PINK EDITION');
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth());
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());
  const [showLockClock, setShowLockClock] = useState<boolean>(true);
  const [idName, setIdName] = useState<string>('Callysta');
  const [idRole, setIdRole] = useState<string>('Studio Creator');
  const [idNumber, setIdNumber] = useState<string>('CC-2026-088');

  // GIF & Slideshow controls
  const [gifDelayMs, setGifDelayMs] = useState<number>(380);
  const [gifStep, setGifStep] = useState<number>(0);
  const [isExportingGif, setIsExportingGif] = useState<boolean>(false);
  const [slideTransition, setSlideTransition] = useState<'fade' | 'slide' | 'zoom'>('fade');
  const [isRecordingSlideshow, setIsRecordingSlideshow] = useState<boolean>(false);
  const [slideshowVideoUrl, setSlideshowVideoUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [imagesVersion, setImagesVersion] = useState(0);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!initialProject || initialProject.kind !== 'creative-mode') return;
    try {
      const parsed = JSON.parse(initialProject.stateJson);
      if (parsed.mode) setMode(parsed.mode);
      if (typeof parsed.themeIndex === 'number') setThemeIndex(parsed.themeIndex);
      if (Array.isArray(parsed.photos) && parsed.photos.length > 0) setPhotos(parsed.photos);
      if (typeof parsed.headline === 'string') setHeadline(parsed.headline);
      if (typeof parsed.subtitle === 'string') setSubtitle(parsed.subtitle);
      if (typeof parsed.caption === 'string') setCaption(parsed.caption);
      if (typeof parsed.badgeText === 'string') setBadgeText(parsed.badgeText);
      if (typeof parsed.idName === 'string') setIdName(parsed.idName);
      if (typeof parsed.idRole === 'string') setIdRole(parsed.idRole);
      if (typeof parsed.idNumber === 'string') setIdNumber(parsed.idNumber);
    } catch {
      // Ignore malformed project JSON
    }
  }, [initialProject]);

  // Preload photos into cache
  useEffect(() => {
    let active = true;
    Promise.all(
      photos.map(async (src) => {
        if (!src || loadedImagesRef.current.has(src)) return;
        try {
          const img = await loadHtmlImage(src);
          loadedImagesRef.current.set(src, img);
        } catch {
          // Ignore single image failure
        }
      })
    ).then(() => {
      if (active) setImagesVersion((v) => v + 1);
    });
    return () => {
      active = false;
    };
  }, [photos]);

  // Animate GIF / Slideshow preview
  useEffect(() => {
    if (mode !== 'gif' && mode !== 'slideshow') return;
    const intervalMs = mode === 'gif' ? gifDelayMs : 1200;
    const timer = setInterval(() => {
      setGifStep((s) => (s + 1) % Math.max(1, photos.length));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [mode, gifDelayMs, photos.length]);

  const theme = PALETTE_THEMES[themeIndex % PALETTE_THEMES.length];

  const getImg = useCallback(
    (idx: number): HTMLImageElement | null => {
      const src = photos[idx % photos.length];
      return src ? loadedImagesRef.current.get(src) || null : null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [photos, imagesVersion]
  );

  // Render active mode to canvas
  const renderModeCanvas = useCallback(
    (canvas: HTMLCanvasElement, frameIndexOverride?: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img0 = getImg(0);
      const img1 = getImg(1);
      const img2 = getImg(2);
      const img3 = getImg(3);

      // Determine canvas dimensions per mode
      if (mode === 'wallpaper') {
        canvas.width = 720;
        canvas.height = 1280;
      } else if (mode === 'photocard' || mode === 'magazine' || mode === 'journal') {
        canvas.width = 800;
        canvas.height = 1120;
      } else if (mode === 'idcard') {
        canvas.width = 960;
        canvas.height = 600;
      } else if (mode === 'polaroid') {
        canvas.width = 780;
        canvas.height = 960;
      } else if (mode === 'calendar') {
        canvas.width = 900;
        canvas.height = 1080;
      } else {
        canvas.width = 900;
        canvas.height = 900;
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, w, h);

      if (mode === 'polaroid') {
        ctx.fillStyle = theme.card;
        ctx.shadowColor = 'rgba(45, 27, 40, 0.14)';
        ctx.shadowBlur = 28;
        ctx.shadowOffsetY = 10;
        drawRoundedRectPath(ctx, 48, 44, w - 96, h - 88, 16);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 3;
        ctx.stroke();

        if (img0) {
          ctx.save();
          drawRoundedRectPath(ctx, 84, 82, w - 168, 630, 10);
          ctx.clip();
          drawCoverImage(ctx, img0, 84, 82, w - 168, 630);
          ctx.restore();
        }
        ctx.fillStyle = theme.ink;
        ctx.textAlign = 'center';
        ctx.font = 'italic 600 34px "Playfair Display", Georgia, serif';
        ctx.fillText(caption, w / 2, 792);
        ctx.fillStyle = theme.accent;
        ctx.font = '600 18px "JetBrains Mono", monospace';
        ctx.fillText(subtitle, w / 2, 846);
      } else if (mode === 'photocard') {
        // K-Pop / Korean collectible binder card
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, theme.bg);
        grad.addColorStop(1, theme.border);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = theme.card;
        drawRoundedRectPath(ctx, 56, 56, w - 112, h - 112, 42);
        ctx.fill();
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 6;
        ctx.stroke();

        if (img0) {
          ctx.save();
          drawRoundedRectPath(ctx, 86, 86, w - 172, h - 290, 28);
          ctx.clip();
          drawCoverImage(ctx, img0, 86, 86, w - 172, h - 290);
          ctx.restore();
        }

        // Holo sparkles
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = 'bold 34px sans-serif';
        ctx.fillText('✦', 120, 138);
        ctx.fillText('♡', w - 150, 145);

        ctx.fillStyle = theme.accent;
        ctx.font = '700 18px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(badgeText, 92, h - 148);
        ctx.fillStyle = theme.ink;
        ctx.font = '700 40px "Bricolage Grotesque", sans-serif';
        ctx.fillText(headline, 92, h - 100);
        ctx.textAlign = 'right';
        ctx.font = '600 20px "JetBrains Mono", monospace';
        ctx.fillStyle = theme.accent;
        ctx.fillText('VER. 01 ★', w - 92, h - 102);
      } else if (mode === 'magazine') {
        if (img0) {
          drawCoverImage(ctx, img0, 0, 0, w, h);
        }
        const shade = ctx.createLinearGradient(0, 0, 0, h);
        shade.addColorStop(0, 'rgba(45, 27, 40, 0.48)');
        shade.addColorStop(0.35, 'rgba(45, 27, 40, 0)');
        shade.addColorStop(0.7, 'rgba(45, 27, 40, 0.08)');
        shade.addColorStop(1, 'rgba(45, 27, 40, 0.65)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = theme.card;
        ctx.lineWidth = 14;
        ctx.strokeRect(20, 20, w - 40, h - 40);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '800 104px "Playfair Display", Georgia, serif';
        ctx.fillText(headline.slice(0, 12).toUpperCase(), w / 2, 138);

        ctx.fillStyle = theme.accent;
        drawRoundedRectPath(ctx, 56, 165, 260, 40, 20);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 16px "JetBrains Mono", monospace';
        ctx.fillText(badgeText.slice(0, 22), 186, 191);

        ctx.textAlign = 'left';
        ctx.font = 'italic 700 40px "Playfair Display", Georgia, serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(caption.slice(0, 28), 54, h - 106);
        ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#FCE7F3';
        ctx.fillText(subtitle.slice(0, 42), 54, h - 66);

        // Editorial barcode
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(w - 160, h - 118, 108, 66);
        ctx.fillStyle = '#18181B';
        for (let b = 0; b < 14; b++) {
          ctx.fillRect(w - 150 + b * 6.5, h - 110, b % 3 === 0 ? 3 : 1.8, 42);
        }
        ctx.font = '600 11px monospace';
        ctx.fillText('CAMCALL', w - 146, h - 57);
      } else if (mode === 'moodboard') {
        const pad = 42;
        ctx.fillStyle = theme.card;
        drawRoundedRectPath(ctx, pad, pad, w - pad * 2, h - pad * 2, 28);
        ctx.fill();
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 3;
        ctx.stroke();

        const slots = [
          { x: 76, y: 120, sw: 360, sh: 340, img: img0 },
          { x: 460, y: 120, sw: 364, sh: 230, img: img1 },
          { x: 460, y: 374, sw: 364, sh: 330, img: img2 },
          { x: 76, y: 484, sw: 360, sh: 220, img: img3 },
        ];
        slots.forEach((s) => {
          if (s.img) {
            ctx.save();
            drawRoundedRectPath(ctx, s.x, s.y, s.sw, s.sh, 18);
            ctx.clip();
            drawCoverImage(ctx, s.img, s.x, s.y, s.sw, s.sh);
            ctx.restore();
          }
        });

        ctx.fillStyle = theme.ink;
        ctx.textAlign = 'left';
        ctx.font = '700 32px "Bricolage Grotesque", sans-serif';
        ctx.fillText(headline, 76, 94);
        ctx.fillStyle = theme.accent;
        ctx.textAlign = 'right';
        ctx.font = '600 18px "JetBrains Mono", monospace';
        ctx.fillText(badgeText, w - 76, 92);

        // Aesthetic color palette dots at bottom
        const swatches = [theme.accent, theme.border, theme.bg, '#F9A8D4', '#C4B5FD'];
        swatches.forEach((swColor, idx) => {
          ctx.fillStyle = swColor;
          ctx.beginPath();
          ctx.arc(110 + idx * 62, 772, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = theme.border;
          ctx.lineWidth = 2;
          ctx.stroke();
        });
        ctx.textAlign = 'right';
        ctx.fillStyle = theme.ink;
        ctx.font = 'italic 600 26px "Playfair Display", Georgia, serif';
        ctx.fillText(caption, w - 76, 780);
      } else if (mode === 'pfp') {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, theme.bg);
        grad.addColorStop(1, theme.border);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Outer decorative ring
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 22;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 340, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = theme.card;
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 318, 0, Math.PI * 2);
        ctx.stroke();

        if (img0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, 306, 0, Math.PI * 2);
          ctx.clip();
          drawCoverImage(ctx, img0, w / 2 - 306, h / 2 - 306, 612, 612);
          ctx.restore();
        }

        // Cute badge pill
        ctx.fillStyle = theme.accent;
        drawRoundedRectPath(ctx, w / 2 - 145, h - 122, 290, 56, 28);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.font = '700 24px "Bricolage Grotesque", sans-serif';
        ctx.fillText(caption.slice(0, 18), w / 2, h - 86);
      } else if (mode === 'wallpaper') {
        if (img0) {
          drawCoverImage(ctx, img0, 0, 0, w, h);
        }
        const topFade = ctx.createLinearGradient(0, 0, 0, 420);
        topFade.addColorStop(0, 'rgba(45, 27, 40, 0.55)');
        topFade.addColorStop(1, 'rgba(45, 27, 40, 0)');
        ctx.fillStyle = topFade;
        ctx.fillRect(0, 0, w, 420);

        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 16;
        drawRoundedRectPath(ctx, 22, 22, w - 44, h - 44, 48);
        ctx.stroke();

        if (showLockClock) {
          ctx.textAlign = 'center';
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(
            new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }),
            w / 2,
            150
          );
          ctx.font = '800 132px "Bricolage Grotesque", sans-serif';
          ctx.fillText('10:24', w / 2, 280);
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        drawRoundedRectPath(ctx, 110, h - 150, w - 220, 62, 31);
        ctx.fill();
        ctx.fillStyle = theme.accent;
        ctx.font = '700 22px "Bricolage Grotesque", sans-serif';
        ctx.fillText(caption.slice(0, 30), w / 2, h - 111);
      } else if (mode === 'calendar') {
        ctx.fillStyle = theme.card;
        drawRoundedRectPath(ctx, 36, 36, w - 72, h - 72, 28);
        ctx.fill();
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 4;
        ctx.stroke();

        if (img0) {
          ctx.save();
          drawRoundedRectPath(ctx, 68, 68, w - 136, 470, 22);
          ctx.clip();
          drawCoverImage(ctx, img0, 68, 68, w - 136, 470);
          ctx.restore();
        }

        const monthLabel = new Date(calYear, calMonth, 1).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });
        ctx.fillStyle = theme.accent;
        ctx.textAlign = 'left';
        ctx.font = '800 42px "Bricolage Grotesque", sans-serif';
        ctx.fillText(monthLabel.toUpperCase(), 72, 600);
        ctx.fillStyle = theme.ink;
        ctx.textAlign = 'right';
        ctx.font = '600 20px "Playfair Display", Georgia, serif';
        ctx.fillText(caption.slice(0, 28), w - 72, 598);

        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const gridX = 72;
        const gridY = 640;
        const colW = (w - 144) / 7;
        ctx.textAlign = 'center';
        ctx.font = '700 16px "JetBrains Mono", monospace';
        days.forEach((d, idx) => {
          ctx.fillStyle = idx === 0 ? theme.accent : theme.ink;
          ctx.fillText(d, gridX + colW * idx + colW / 2, gridY);
        });

        const firstDay = new Date(calYear, calMonth, 1).getDay();
        const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
        ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
        for (let day = 1; day <= totalDays; day++) {
          const cell = firstDay + day - 1;
          const col = cell % 7;
          const row = Math.floor(cell / 7);
          const cx = gridX + col * colW + colW / 2;
          const cy = gridY + 54 + row * 64;
          if (day === 14) {
            ctx.fillStyle = theme.accent;
            ctx.beginPath();
            ctx.arc(cx, cy - 8, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
          } else {
            ctx.fillStyle = col === 0 ? theme.accent : theme.ink;
          }
          ctx.fillText(String(day), cx, cy);
        }
      } else if (mode === 'journal') {
        // Aesthetic dot/grid notebook journal
        ctx.fillStyle = theme.card;
        drawRoundedRectPath(ctx, 40, 40, w - 80, h - 80, 24);
        ctx.fill();

        // Subtle grid lines
        ctx.strokeStyle = 'rgba(219, 39, 119, 0.08)';
        ctx.lineWidth = 1.5;
        for (let gx = 70; gx < w - 70; gx += 36) {
          ctx.beginPath();
          ctx.moveTo(gx, 70);
          ctx.lineTo(gx, h - 70);
          ctx.stroke();
        }
        for (let gy = 70; gy < h - 70; gy += 36) {
          ctx.beginPath();
          ctx.moveTo(70, gy);
          ctx.lineTo(w - 70, gy);
          ctx.stroke();
        }

        // Photo print tilted slightly with washi tape
        ctx.save();
        ctx.translate(w / 2, 390);
        ctx.rotate(-0.04);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.12)';
        ctx.shadowBlur = 20;
        ctx.fillRect(-260, -240, 520, 490);
        ctx.shadowColor = 'transparent';
        if (img0) {
          drawCoverImage(ctx, img0, -236, -216, 472, 410);
        }
        // Washi tape
        ctx.fillStyle = 'rgba(244, 114, 182, 0.72)';
        ctx.fillRect(-90, -264, 180, 42);
        ctx.restore();

        // Journal lines
        ctx.textAlign = 'left';
        ctx.fillStyle = theme.accent;
        ctx.font = '700 22px "JetBrains Mono", monospace';
        ctx.fillText(new Date().toLocaleDateString('en-US', { dateStyle: 'medium' }), 92, 740);
        ctx.fillStyle = theme.ink;
        ctx.font = '700 40px "Playfair Display", Georgia, serif';
        ctx.fillText(headline, 92, 796);
        ctx.font = '500 26px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(caption, 92, 854);
        ctx.fillText(subtitle, 92, 900);
      } else if (mode === 'gif' || mode === 'slideshow') {
        const idx = frameIndexOverride !== undefined ? frameIndexOverride : gifStep;
        const currImg = getImg(idx) || img0;
        ctx.fillStyle = theme.card;
        drawRoundedRectPath(ctx, 44, 44, w - 88, h - 88, 32);
        ctx.fill();
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 4;
        ctx.stroke();

        if (currImg) {
          ctx.save();
          drawRoundedRectPath(ctx, 76, 76, w - 152, h - 220, 22);
          ctx.clip();
          if (mode === 'slideshow' && slideTransition === 'zoom') {
            const zoomAmt = 1.06;
            const zw = (w - 152) * zoomAmt;
            const zh = (h - 220) * zoomAmt;
            drawCoverImage(ctx, currImg, 76 - (zw - (w - 152)) / 2, 76 - (zh - (h - 220)) / 2, zw, zh);
          } else {
            drawCoverImage(ctx, currImg, 76, 76, w - 152, h - 220);
          }
          ctx.restore();
        }

        ctx.fillStyle = theme.ink;
        ctx.textAlign = 'left';
        ctx.font = '700 30px "Bricolage Grotesque", sans-serif';
        ctx.fillText(caption, 80, h - 82);
        ctx.textAlign = 'right';
        ctx.fillStyle = theme.accent;
        ctx.font = '700 20px "JetBrains Mono", monospace';
        ctx.fillText(
          `${mode === 'gif' ? 'GIF' : 'SLIDE'} ${(idx % photos.length) + 1}/${photos.length}`,
          w - 80,
          h - 84
        );
      } else if (mode === 'idcard') {
        ctx.fillStyle = theme.card;
        drawRoundedRectPath(ctx, 44, 44, w - 88, h - 88, 34);
        ctx.fill();
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 5;
        ctx.stroke();

        // Header bar
        ctx.fillStyle = theme.accent;
        drawRoundedRectPath(ctx, 44, 44, w - 88, 108, 30);
        ctx.fill();
        ctx.fillRect(44, 110, w - 88, 42);

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.font = '800 34px "Bricolage Grotesque", sans-serif';
        ctx.fillText('CAMCALL STUDIO PASS', 84, 110);
        ctx.textAlign = 'right';
        ctx.font = '700 20px "JetBrains Mono", monospace';
        ctx.fillText(idNumber, w - 84, 108);

        if (img0) {
          ctx.save();
          drawRoundedRectPath(ctx, 84, 190, 260, 310, 20);
          ctx.clip();
          drawCoverImage(ctx, img0, 84, 190, 260, 310);
          ctx.restore();
          ctx.strokeStyle = theme.border;
          ctx.lineWidth = 4;
          drawRoundedRectPath(ctx, 84, 190, 260, 310, 20);
          ctx.stroke();
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = theme.accent;
        ctx.font = '700 18px "JetBrains Mono", monospace';
        ctx.fillText('MEMBER NAME', 384, 232);
        ctx.fillStyle = theme.ink;
        ctx.font = '800 44px "Bricolage Grotesque", sans-serif';
        ctx.fillText(idName, 384, 282);

        ctx.fillStyle = theme.accent;
        ctx.font = '700 18px "JetBrains Mono", monospace';
        ctx.fillText('ROLE / STUDIO CLUB', 384, 344);
        ctx.fillStyle = theme.ink;
        ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(idRole, 384, 384);

        ctx.fillStyle = theme.bg;
        drawRoundedRectPath(ctx, 384, 422, 480, 72, 16);
        ctx.fill();
        ctx.fillStyle = theme.ink;
        ctx.font = '600 20px "Playfair Display", Georgia, serif';
        ctx.fillText(subtitle, 408, 466);
      } else {
        // Scrapbook quick preview card
        ctx.fillStyle = theme.card;
        drawRoundedRectPath(ctx, 48, 48, w - 96, h - 96, 28);
        ctx.fill();
        if (img0) {
          ctx.save();
          drawRoundedRectPath(ctx, 110, 120, 420, 420, 18);
          ctx.clip();
          drawCoverImage(ctx, img0, 110, 120, 420, 420);
          ctx.restore();
        }
        if (img1) {
          ctx.save();
          drawRoundedRectPath(ctx, 430, 340, 370, 370, 18);
          ctx.clip();
          drawCoverImage(ctx, img1, 430, 340, 370, 370);
          ctx.restore();
        }
        ctx.fillStyle = theme.accent;
        ctx.textAlign = 'left';
        ctx.font = '700 36px "Playfair Display", Georgia, serif';
        ctx.fillText(caption, 92, 790);
      }
    },
    [
      mode,
      theme,
      getImg,
      caption,
      subtitle,
      headline,
      badgeText,
      calMonth,
      calYear,
      showLockClock,
      gifStep,
      photos.length,
      slideTransition,
      idName,
      idRole,
      idNumber,
    ]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderModeCanvas(canvas);
  }, [renderModeCanvas]);

  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotos((prev) => prev.map((p, i) => (i === activeSlot ? (reader.result as string) : p)));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDownloadResult = async () => {
    if (mode === 'gif') {
      setIsExportingGif(true);
      try {
        const frameCanvases: HTMLCanvasElement[] = [];
        for (let i = 0; i < photos.length; i++) {
          const c = document.createElement('canvas');
          c.width = 480;
          c.height = 480;
          renderModeCanvas(c, i);
          // Scale down smoothly for fast animated GIF encoding
          const scaled = document.createElement('canvas');
          scaled.width = 420;
          scaled.height = 420;
          const sctx = scaled.getContext('2d');
          if (sctx) sctx.drawImage(c, 0, 0, scaled.width, scaled.height);
          frameCanvases.push(scaled);
        }
        const blob = encodeCanvasesToGifBlob(frameCanvases, gifDelayMs);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `camcall-animated-${Date.now()}.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onNotify(t.notifications.downloaded);
      } finally {
        setIsExportingGif(false);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `camcall-${mode}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify(t.notifications.downloaded);
  };

  const handleExportSlideshowVideo = () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') {
      onNotify('Video recording unsupported in this browser.', 'info');
      return;
    }
    try {
      const stream = canvas.captureStream(24);
      const mime = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '';
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunks, { type: mime || 'video/webm' });
        const url = URL.createObjectURL(blob);
        setSlideshowVideoUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setIsRecordingSlideshow(false);
        onNotify('Slideshow video clip ready!');
      };
      recorder.start();
      setIsRecordingSlideshow(true);
      setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, 4800);
    } catch {
      onNotify('Could not export slideshow video.', 'info');
    }
  };

  const handleSaveToGallery = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    await savePhotoToDb({
      title: t.creativeModes.modes[mode],
      dataUrl,
      source: 'creative',
      format: 'png',
      favorite: false,
    });
    await recordHistoryDb('download', mode, t.creativeModes.modes[mode]);
    onNotify(t.notifications.savedGallery);
  };

  const handleSaveProject = async () => {
    const canvas = canvasRef.current;
    const thumb = canvas ? canvas.toDataURL('image/jpeg', 0.75) : '';
    await saveProjectToDb({
      title: `${t.creativeModes.modes[mode]} · ${headline}`,
      kind: 'creative-mode',
      thumbnailUrl: thumb,
      stateJson: JSON.stringify({
        mode,
        themeIndex,
        photos,
        headline,
        subtitle,
        caption,
        badgeText,
        idName,
        idRole,
        idNumber,
      }),
    });
    onNotify(t.notifications.savedProject);
  };

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, m) =>
        new Date(2026, m, 1).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
          month: 'long',
        })
      ),
    [lang]
  );

  return (
    <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadPhoto}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <CamcallLogo variant="badge" size="md" className="mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[#db2777] mb-1">{t.creativeModes.kicker}</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              {t.creativeModes.title}
            </h1>
            <p className="text-sm opacity-75 mt-1 max-w-2xl">{t.creativeModes.subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenScrapbookStudio}
          className="min-h-[42px] px-4 py-2 rounded-xl camcall-surface border hover:border-[#db2777] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer self-start"
        >
          <Sparkles className="w-4 h-4 text-[#db2777]" />
          <span>{t.creativeModes.openShapesStudio}</span>
        </button>
      </div>

      {/* 12 Creative Modes Switcher */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {MODE_LIST.map(({ id, Icon }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`min-h-[44px] px-3 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                active
                  ? 'bg-[#db2777] text-white border-[#db2777] shadow-sm'
                  : 'camcall-surface hover:border-[#db2777]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{t.creativeModes.modes[id]}</span>
            </button>
          );
        })}
      </div>

      {/* Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Live Rendered Preview */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="rounded-3xl camcall-surface border p-4 flex flex-col gap-3">
            <div className="rounded-2xl camcall-surface-soft border p-4 flex items-center justify-center min-h-[360px] max-h-[580px]">
              <canvas
                ref={canvasRef}
                data-testid="creative-mode-canvas"
                className="max-w-full max-h-[530px] w-auto h-auto rounded-xl shadow-md"
              />
            </div>

            {/* Photo Slots for current Creative Mode */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {photos.map((src, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSlot(idx)}
                    className={`w-12 h-12 rounded-xl overflow-hidden border-2 cursor-pointer ${
                      activeSlot === idx ? 'border-[#db2777] scale-105' : 'border-transparent opacity-80'
                    }`}
                    aria-label={`Select photo slot ${idx + 1}`}
                  >
                    <img src={src} alt={`Slot ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCameraModalOpen(true)}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#db2777] hover:bg-[#be185d] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{t.creativeModes.captureCam}</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl camcall-surface-soft border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#7c3aed]" />
                  <span>{t.creativeModes.uploadPhoto}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Mode Controls + Save & Download */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-3xl camcall-surface border p-5 flex flex-col gap-4">
            <h2 className="font-display text-lg font-bold">{t.creativeModes.modes[mode]}</h2>

            {/* Color Palette Theme Picker */}
            <div>
              <span className="text-xs font-semibold opacity-75 block mb-2">Studio Palette</span>
              <div className="flex flex-wrap gap-2">
                {PALETTE_THEMES.map((pt, idx) => (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => setThemeIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                      themeIndex === idx
                        ? 'border-[#db2777] bg-[#fce7f3] text-[#be185d]'
                        : 'camcall-surface-soft'
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'scrapbook' && (
              <div className="p-3.5 rounded-2xl camcall-surface-soft border flex flex-col gap-2">
                <p className="text-xs opacity-80">
                  Launch the full multi-layer Scrapbook Studio with drag-and-drop Washi Tape, 22 photo
                  shapes, 48 themes, and 15 sticker packs!
                </p>
                <button
                  type="button"
                  onClick={onOpenScrapbookStudio}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold cursor-pointer"
                >
                  {t.creativeModes.openShapesStudio} →
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <label className="flex flex-col gap-1 text-xs font-semibold">
                <span>Title / Headline</span>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="px-3 py-2 rounded-xl camcall-surface-soft border text-xs"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold">
                <span>Caption</span>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="px-3 py-2 rounded-xl camcall-surface-soft border text-xs"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold">
                <span>Subtitle / Date</span>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="px-3 py-2 rounded-xl camcall-surface-soft border text-xs"
                />
              </label>

              {(mode === 'magazine' || mode === 'photocard' || mode === 'moodboard') && (
                <label className="flex flex-col gap-1 text-xs font-semibold">
                  <span>Badge / Tag</span>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    className="px-3 py-2 rounded-xl camcall-surface-soft border text-xs"
                  />
                </label>
              )}

              {mode === 'wallpaper' && (
                <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLockClock}
                    onChange={(e) => setShowLockClock(e.target.checked)}
                    className="accent-[#db2777]"
                  />
                  <span>Show Lockscreen Clock Preview</span>
                </label>
              )}

              {mode === 'calendar' && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-xs font-semibold">
                    <span>Month</span>
                    <select
                      value={calMonth}
                      onChange={(e) => setCalMonth(Number(e.target.value))}
                      className="px-2.5 py-2 rounded-xl camcall-surface-soft border text-xs"
                    >
                      {monthNames.map((mName, idx) => (
                        <option key={mName} value={idx}>
                          {mName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold">
                    <span>Year</span>
                    <input
                      type="number"
                      min={2020}
                      max={2035}
                      value={calYear}
                      onChange={(e) => setCalYear(Number(e.target.value))}
                      className="px-2.5 py-2 rounded-xl camcall-surface-soft border text-xs"
                    />
                  </label>
                </div>
              )}

              {mode === 'idcard' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-xs font-semibold">
                    <span>Member Name</span>
                    <input
                      type="text"
                      value={idName}
                      onChange={(e) => setIdName(e.target.value)}
                      className="px-2.5 py-2 rounded-xl camcall-surface-soft border text-xs"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold">
                    <span>Role</span>
                    <input
                      type="text"
                      value={idRole}
                      onChange={(e) => setIdRole(e.target.value)}
                      className="px-2.5 py-2 rounded-xl camcall-surface-soft border text-xs"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold sm:col-span-2">
                    <span>ID Number</span>
                    <input
                      type="text"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      className="px-2.5 py-2 rounded-xl camcall-surface-soft border text-xs font-mono"
                    />
                  </label>
                </div>
              )}

              {mode === 'gif' && (
                <label className="flex flex-col gap-1 text-xs font-semibold">
                  <div className="flex justify-between">
                    <span>Frame Speed ({gifDelayMs}ms)</span>
                  </div>
                  <input
                    type="range"
                    min={150}
                    max={900}
                    step={50}
                    value={gifDelayMs}
                    onChange={(e) => setGifDelayMs(Number(e.target.value))}
                    className="studio-slider w-full"
                  />
                </label>
              )}

              {mode === 'slideshow' && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold">Transition Effect</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['fade', 'slide', 'zoom'] as const).map((tr) => (
                      <button
                        key={tr}
                        type="button"
                        onClick={() => setSlideTransition(tr)}
                        className={`py-2 rounded-xl text-xs font-semibold uppercase cursor-pointer ${
                          slideTransition === tr
                            ? 'bg-[#db2777] text-white'
                            : 'camcall-surface-soft border'
                        }`}
                      >
                        {tr}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={isRecordingSlideshow}
                    onClick={handleExportSlideshowVideo}
                    className="min-h-[40px] px-3 py-2 rounded-xl bg-[#7c3aed] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {isRecordingSlideshow ? 'Recording 5s Slideshow...' : 'Record Slideshow (.webm)'}
                  </button>
                  {slideshowVideoUrl && (
                    <a
                      href={slideshowVideoUrl}
                      download={`camcall-slideshow-${Date.now()}.webm`}
                      className="text-xs font-semibold text-[#db2777] underline text-center"
                    >
                      Download Slideshow Video (.webm)
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Save & Download Card */}
          <div className="rounded-3xl camcall-surface border p-4 flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSaveToGallery}
                className="min-h-[42px] px-3 py-2 rounded-xl camcall-surface-soft border hover:border-[#db2777] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FolderHeart className="w-4 h-4 text-[#db2777]" />
                <span>{t.creativeModes.saveGallery}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveProject}
                className="min-h-[42px] px-3 py-2 rounded-xl camcall-surface-soft border hover:border-[#7c3aed] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4 text-[#7c3aed]" />
                <span>{t.creativeModes.saveProject}</span>
              </button>
            </div>

            <button
              type="button"
              disabled={isExportingGif}
              onClick={handleDownloadResult}
              className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[#db2777] hover:bg-[#be185d] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {mode === 'gif'
                  ? isExportingGif
                    ? 'Encoding GIF...'
                    : 'Download Animated GIF'
                  : t.creativeModes.downloadResult}
              </span>
            </button>
          </div>
        </div>
      </div>

      <LiveCameraCaptureModal
        open={cameraModalOpen}
        title={`${t.creativeModes.captureCam} · Slot #${activeSlot + 1}`}
        initialAspectRatio={mode === 'wallpaper' ? '9:16' : '3:4'}
        onCapture={(dataUrl) => {
          setPhotos((prev) => prev.map((p, i) => (i === activeSlot ? dataUrl : p)));
          onNotify(`Captured slot #${activeSlot + 1} from camera!`);
        }}
        onClose={() => setCameraModalOpen(false)}
      />
    </section>
  );
}
