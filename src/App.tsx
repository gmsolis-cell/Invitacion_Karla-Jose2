import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  MapPin,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  Shirt,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

const VIDEO_SRC =
  './assets/aistudio/Video_para_dispositivos_m_viles_minimalista_invitaci_n_animada_para_boda_save_the_date_en_color_caf___beige_y_blanco_b2f926ee.mp4';
const GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/4YSEve9WCgkCeNYaA';
const WHATSAPP_PHONE = '593963296255'; // +593 96 329 6255 sin símbolos ni espacios
// Sábado 19 de Diciembre 2026 · 13:30 PM (Ecuador UTC-5)
const WEDDING_TARGET_ISO = '2026-12-19T13:30:00-05:00';
const RSVP_STORAGE_KEY = 'jk_wedding_rsvp_v2';

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

interface SavedRsvp {
  name: string;
  attending: 'yes' | 'no';
  note: string;
  submittedAt: string;
}

interface FireworkRocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  color: string;
  burstKind: BurstKind;
}

interface FireworkSpark {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  size: number;
  color: string;
  twinklePhase: number;
  drag: number;
  gravity: number;
  isShaped: boolean;
}

type BurstKind = 'classic' | 'heart' | 'letterJ' | 'letterK';

// Tonos dorados más brillantes y luminosos sobre el fondo blanco
const GOLD_PALETTE = [
  '#ffd000',
  '#ffb703',
  '#f5b800',
  '#ffe066',
  '#e6a817',
  '#ffc933',
];

function sampleQuadBezier(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  steps: number
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    pts.push({
      x: inv * inv * x0 + 2 * inv * t * cx + t * t * x1,
      y: inv * inv * y0 + 2 * inv * t * cy + t * t * y1,
    });
  }
  return pts;
}

function getShapeOffsets(kind: Exclude<BurstKind, 'classic'>): Array<{ x: number; y: number }> {
  if (kind === 'heart') {
    const pts: Array<{ x: number; y: number }> = [];
    const total = 44;
    for (let i = 0; i < total; i++) {
      const t = (Math.PI * 2 * i) / total;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pts.push({ x: hx / 16, y: hy / 16 });
    }
    return pts;
  }

  if (kind === 'letterJ') {
    // Inicial cursiva "J" elegante y fluida
    return [
      // Trazo caligráfico de entrada superior
      ...sampleQuadBezier(-0.08, -0.56, 0.24, -0.96, 0.42, -0.78, 10),
      // Tallo principal inclinado suavemente en cursiva
      ...sampleQuadBezier(0.42, -0.78, 0.24, -0.08, 0.04, 0.62, 16),
      // Bucle inferior cursivo que sube hacia la izquierda
      ...sampleQuadBezier(0.04, 0.62, -0.28, 0.98, -0.44, 0.56, 12),
      // Cruce ascendente caligráfico
      ...sampleQuadBezier(-0.44, 0.56, -0.34, 0.22, 0.34, -0.06, 12),
    ];
  }

  // Inicial cursiva "K" elegante y fluida
  return [
    // Rizo de entrada superior y tallo inclinado en cursiva
    ...sampleQuadBezier(-0.56, -0.68, -0.34, -0.94, -0.26, -0.72, 8),
    ...sampleQuadBezier(-0.26, -0.72, -0.34, 0.08, -0.46, 0.86, 16),
    // Gancho inferior del tallo
    ...sampleQuadBezier(-0.46, 0.86, -0.58, 0.9, -0.64, 0.78, 5),
    // Brazo cursivo superior con rizo de entrada
    ...sampleQuadBezier(0.32, -0.88, 0.52, -0.94, 0.44, -0.78, 6),
    ...sampleQuadBezier(0.44, -0.78, 0.06, -0.42, -0.28, 0.04, 14),
    // Pierna cursiva inferior con cola elegante
    ...sampleQuadBezier(-0.22, -0.02, 0.14, 0.22, 0.28, 0.72, 12),
    ...sampleQuadBezier(0.28, 0.72, 0.42, 0.94, 0.64, 0.74, 8),
  ];
}

function GoldFireworksCanvas({ burstTrigger }: { burstTrigger: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const triggerRef = useRef(burstTrigger);

  useEffect(() => {
    triggerRef.current = burstTrigger;
  }, [burstTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const rockets: FireworkRocket[] = [];
    const sparks: FireworkSpark[] = [];

    // Secuencia estricta cada 6 segundos: primero J, luego K y al final corazón
    const shapeSequence: Array<Exclude<BurstKind, 'classic'>> = [
      'letterJ',
      'letterK',
      'heart',
    ];
    let shapeIndex = 0;

    const createBurst = (cx: number, cy: number, kind: BurstKind = 'classic') => {
      if (kind !== 'classic') {
        const shapePts = getShapeOffsets(kind);
        const radius = width >= 640 ? 54 : 38;
        const velocityScale = radius * 0.06;

        for (let i = 0; i < shapePts.length; i++) {
          const pt = shapePts[i];
          const jitterX = (Math.random() - 0.5) * 0.09;
          const jitterY = (Math.random() - 0.5) * 0.09;
          sparks.push({
            x: cx,
            y: cy,
            prevX: cx,
            prevY: cy,
            vx: pt.x * velocityScale + jitterX,
            vy: pt.y * velocityScale + jitterY,
            alpha: 0.98,
            decay: 0.0042 + Math.random() * 0.0018,
            size: 1.9 + Math.random() * 0.9,
            color: GOLD_PALETTE[Math.floor(Math.random() * GOLD_PALETTE.length)],
            twinklePhase: Math.random() * Math.PI * 2,
            drag: 0.94,
            gravity: 0.006,
            isShaped: true,
          });
        }
        return;
      }

      // Más pirotecnia normal brillante que explota y cae lento
      const count = width >= 640 ? 38 : 28;
      const baseColor = GOLD_PALETTE[Math.floor(Math.random() * GOLD_PALETTE.length)];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.22;
        const speed = 1.05 + Math.random() * 2.25;
        sparks.push({
          x: cx,
          y: cy,
          prevX: cx,
          prevY: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 0.94,
          decay: 0.0048 + Math.random() * 0.0028,
          size: 1.55 + Math.random() * 1.45,
          color: Math.random() > 0.25 ? GOLD_PALETTE[Math.floor(Math.random() * GOLD_PALETTE.length)] : baseColor,
          twinklePhase: Math.random() * Math.PI * 2,
          drag: 0.972,
          gravity: 0.022,
          isShaped: false,
        });
      }

      // Centro luminoso dorado que cae suavemente
      for (let j = 0; j < 10; j++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.35 + Math.random() * 0.95;
        sparks.push({
          x: cx,
          y: cy,
          prevX: cx,
          prevY: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 0.95,
          decay: 0.0056 + Math.random() * 0.003,
          size: 1.8 + Math.random() * 1.1,
          color: '#ffd700',
          twinklePhase: Math.random() * Math.PI * 2,
          drag: 0.968,
          gravity: 0.02,
          isShaped: false,
        });
      }
    };

    const getSideCoordinates = (side: 'left' | 'right') => {
      const videoEl = document.getElementById('video-frame-box');
      const vRect = videoEl ? videoEl.getBoundingClientRect() : null;

      if (side === 'left') {
        const maxLeftX =
          vRect && vRect.left > 70 ? Math.max(48, vRect.left - 36) : Math.max(44, width * 0.14);
        const minLeftX = Math.min(34, maxLeftX * 0.45);
        return minLeftX + Math.random() * Math.max(12, maxLeftX - minLeftX);
      }

      const minRightX =
        vRect && width - vRect.right > 70
          ? Math.min(width - 48, vRect.right + 36)
          : Math.min(width - 44, width * 0.86);
      const maxRightX = Math.max(minRightX + 12, width - 34);
      return minRightX + Math.random() * (maxRightX - minRightX);
    };

    const launchRocket = (side: 'left' | 'right', burstKind: BurstKind = 'classic') => {
      const startX = getSideCoordinates(side);
      const targetY =
        burstKind === 'classic'
          ? height * (0.12 + Math.random() * 0.46)
          : height * (0.16 + Math.random() * 0.24);
      rockets.push({
        x: startX,
        y: height + 10,
        vx: (Math.random() - 0.5) * 0.45,
        vy: -(3.3 + Math.random() * 1.15),
        targetY,
        color: GOLD_PALETTE[Math.floor(Math.random() * GOLD_PALETTE.length)],
        burstKind,
      });
    };

    // Primer lanzamiento ordenado cada 6s: J al inicio, K a los 6s, corazón a los 12s
    const startTime = performance.now();
    let lastShapeLaunch = startTime;
    let lastClassicLaunch = startTime;
    let lastTriggerSeen = triggerRef.current;
    let nextSide: 'left' | 'right' = 'left';
    let rafId = 0;

    launchRocket('left', shapeSequence[shapeIndex]);
    shapeIndex = (shapeIndex + 1) % shapeSequence.length;
    nextSide = 'right';
    launchRocket('right', 'classic');

    const animate = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      if (triggerRef.current !== lastTriggerSeen) {
        lastTriggerSeen = triggerRef.current;
        launchRocket('left', 'classic');
        launchRocket('right', 'classic');
      }

      // Cada 6 segundos exactos lanzar la siguiente figura cursiva/corazón: J -> K -> corazón
      if (now - lastShapeLaunch >= 6000) {
        lastShapeLaunch = now;
        const nextShape = shapeSequence[shapeIndex];
        shapeIndex = (shapeIndex + 1) % shapeSequence.length;
        launchRocket(nextSide, nextShape);
        nextSide = nextSide === 'left' ? 'right' : 'left';
      }

      // Más pirotecnia normal que explota y cae lento
      const classicInterval = width >= 1024 ? 1050 : 1250;
      if (now - lastClassicLaunch >= classicInterval) {
        lastClassicLaunch = now;
        const classicSide = Math.random() > 0.5 ? 'left' : 'right';
        launchRocket(classicSide, 'classic');
        if (Math.random() > 0.45) {
          launchRocket(classicSide === 'left' ? 'right' : 'left', 'classic');
        }
      }

      // Actualizar cohetes
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        const prevX = r.x;
        const prevY = r.y;
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.02;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(r.x, r.y);
        ctx.strokeStyle = 'rgba(255, 198, 20, 0.78)';
        ctx.lineWidth = 1.9;
        ctx.shadowColor = 'rgba(255, 208, 0, 0.85)';
        ctx.shadowBlur = 8;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff9d6';
        ctx.fill();
        ctx.restore();

        if (r.y <= r.targetY || r.vy >= -0.45) {
          createBurst(r.x, r.y, r.burstKind);
          rockets.splice(i, 1);
        }
      }

      // Actualizar chispas doradas brillantes con caída lenta
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.prevX = s.x;
        s.prevY = s.y;
        s.vx *= s.drag;
        s.vy *= s.drag;
        s.vy += s.gravity;
        s.x += s.vx;
        s.y += s.vy;
        s.alpha -= s.decay;
        s.twinklePhase += 0.12;

        if (s.alpha <= 0.02) {
          sparks.splice(i, 1);
          continue;
        }

        const twinkle = 0.78 + 0.22 * Math.sin(s.twinklePhase);
        const finalAlpha = Math.max(0, Math.min(0.96, s.alpha * twinkle));

        ctx.save();
        ctx.globalAlpha = finalAlpha;
        ctx.shadowColor = 'rgba(255, 196, 15, 0.9)';
        ctx.shadowBlur = s.isShaped ? 12 : 9;

        ctx.beginPath();
        ctx.moveTo(s.prevX, s.prevY);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size * 1.08;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 0.94, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 0.44, 0, Math.PI * 2);
        ctx.fillStyle = '#fffce6';
        ctx.fill();
        ctx.restore();
      }

      // Garantizar que nunca se dibuje o refleje pirotecnia encima del video
      const videoEl = document.getElementById('video-frame-box');
      if (videoEl) {
        const vRect = videoEl.getBoundingClientRect();
        if (vRect.width > 0 && vRect.height > 0) {
          ctx.clearRect(vRect.left - 4, vRect.top - 4, vRect.width + 8, vRect.height + 8);
        }
      }

      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-20 h-full w-full"
      aria-hidden="true"
    />
  );
}

function calculateCountdown(): CountdownState {
  const targetMs = new Date(WEDDING_TARGET_ISO).getTime();
  const diff = targetMs - Date.now();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isPast: false };
}

function padTwo(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const autoMutedByPolicyRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(26.3);
  const [fireworkTrigger, setFireworkTrigger] = useState(0);

  const [countdown, setCountdown] = useState<CountdownState>(() => calculateCountdown());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modales interactivos
  const [isRsvpOpen, setIsRsvpOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Estado RSVP (sin número de personas)
  const [guestName, setGuestName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [attending, setAttending] = useState<'yes' | 'no'>('yes');
  const [guestNote, setGuestNote] = useState('');
  const [savedRsvp, setSavedRsvp] = useState<SavedRsvp | null>(null);

  // Reproducir el video automáticamente desde el momento en que se entra al link
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    const startPlaybackOnEntry = async () => {
      try {
        video.muted = false;
        await video.play();
        if (!cancelled) {
          setIsMuted(false);
          setIsPlaying(true);
          autoMutedByPolicyRef.current = false;
        }
      } catch {
        // Si el navegador bloquea audio sin gesto previo, iniciar video en reproducción inmediata
        // y activar música automáticamente en el primer toque
        try {
          video.muted = true;
          await video.play();
          if (!cancelled) {
            setIsMuted(true);
            setIsPlaying(true);
            autoMutedByPolicyRef.current = true;
          }
        } catch {
          if (!cancelled) setIsPlaying(false);
        }
      }
    };

    startPlaybackOnEntry();

    const unlockSoundOnFirstInteraction = () => {
      if (!autoMutedByPolicyRef.current || !videoRef.current) return;
      videoRef.current.muted = false;
      setIsMuted(false);
      autoMutedByPolicyRef.current = false;
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    };

    window.addEventListener('pointerdown', unlockSoundOnFirstInteraction, { once: true });
    window.addEventListener('keydown', unlockSoundOnFirstInteraction, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('pointerdown', unlockSoundOnFirstInteraction);
      window.removeEventListener('keydown', unlockSoundOnFirstInteraction);
    };
  }, []);

  // Cargar confirmación previa si existe
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RSVP_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedRsvp;
        if (parsed && parsed.name) {
          setSavedRsvp(parsed);
          setGuestName(parsed.name);
          setAttending(parsed.attending);
          setGuestNote(parsed.note || '');
        }
      }
    } catch {
      // Ignorar errores de almacenamiento privado
    }
  }, []);

  // Actualizar cuenta regresiva cada segundo
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(calculateCountdown());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Limpiar toast automáticamente
  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleTogglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = async () => {
    const video = videoRef.current;
    if (!video) return;

    autoMutedByPolicyRef.current = false;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);

    if (video.paused) {
      try {
        await video.play();
        setIsPlaying(true);
      } catch {
        // Sin acción adicional
      }
    }
  };

  const handleReplay = async () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    try {
      video.muted = isMuted;
      await video.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    const nextTime = Number(e.target.value);
    setCurrentTime(nextTime);
    if (video) {
      video.currentTime = nextTime;
    }
  };

  const buildWhatsappUrl = (customText: string) =>
    `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(customText)}`;

  const handleRsvpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = guestName.trim();
    if (!cleanName) {
      setNameError('Por favor escribe tu nombre antes de confirmar por WhatsApp.');
      showToast('Escribe tu nombre completo para confirmar');
      nameInputRef.current?.focus();
      return;
    }

    setNameError(null);

    const record: SavedRsvp = {
      name: cleanName,
      attending,
      note: guestNote.trim(),
      submittedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Ignorar si localStorage no está disponible
    }
    setSavedRsvp(record);
    setFireworkTrigger((prev) => prev + 1);

    const statusLine =
      attending === 'yes'
        ? `¡Hola José y Karla! Soy ${cleanName} y confirmo mi asistencia a su boda el Sábado 19 de Diciembre de 2026.`
        : `¡Hola José y Karla! Soy ${cleanName}. Lamentablemente no podré acompañarles el 19 de Diciembre de 2026, pero les envío mis mejores deseos.`;

    const fullMessage = guestNote.trim()
      ? `${statusLine} Nota: ${guestNote.trim()}`
      : statusLine;

    const waLink = document.createElement('a');
    waLink.href = buildWhatsappUrl(fullMessage);
    waLink.target = '_blank';
    waLink.rel = 'noopener noreferrer';
    document.body.appendChild(waLink);
    waLink.click();
    document.body.removeChild(waLink);
    setIsRsvpOpen(false);
    showToast('Confirmación lista en WhatsApp');
  };

  const handleDownloadIcs = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Jose y Karla//Boda//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:boda-jose-karla-20261219@invitacion',
      'DTSTAMP:20261116T000000Z',
      'DTSTART:20261219T183000Z',
      'DTEND:20261220T030000Z',
      'SUMMARY:Boda — José & Karla',
      'DESCRIPTION:Ceremonia en Molino Del Puente y Recepción en Salón Rosa Bella (13:30 PM). Código de vestimenta: Formal.',
      'LOCATION:Molino Del Puente, Km 14 1/2 Vía Cuenca - Molleturo, Cuenca, Ecuador',
      `URL:${GOOGLE_MAPS_URL}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Boda-Jose-y-Karla-19-Dic-2026.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsCalendarOpen(false);
    showToast('Evento guardado (.ics)');
  };

  const googleCalendarUrl =
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent('Boda — José & Karla')}` +
    '&dates=20261219T183000Z%2F20261220T030000Z' +
    `&details=${encodeURIComponent(
      'Ceremonia en Molino Del Puente y Recepción en Salón Rosa Bella (13:30 PM). Vestimenta: Formal. Mapa: ' +
        GOOGLE_MAPS_URL
    )}` +
    `&location=${encodeURIComponent(
      'Molino Del Puente, Km 14 ½ Vía Cuenca – Molleturo, Cuenca, Ecuador'
    )}`;

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white text-[#2d1e18] selection:bg-[#4f2a1d] selection:text-white">
      {/* Degradado sutil inferior para separar la parte baja del fondo blanco */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-52 bg-gradient-to-t from-[#3a2117]/22 via-[#8c785b]/10 to-transparent"
        aria-hidden="true"
      />

      {/* Animación de fuegos artificiales en dorado sobre los lados (nunca sobre el video) */}
      <GoldFireworksCanvas burstTrigger={fireworkTrigger} />

      {/* Contenedor principal sin menú superior ni barra inferior */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 pt-5 pb-[max(2.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 lg:py-12">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(360px,420px)_1fr] lg:gap-10">
          {/* COLUMNA IZQUIERDA: VIDEO INTERACTIVO CON MÚSICA (reproducción automática al entrar) */}
          <section id="video-invitacion" className="relative z-30 mx-auto w-full max-w-[420px] lg:sticky lg:top-8">
            <div
              id="video-frame-box"
              className="relative overflow-hidden rounded-2xl border-2 border-[#8c785b]/50 bg-[#8c785b] shadow-[0_24px_50px_-12px_rgba(45,30,24,0.38)]"
            >
              {/* Marco vertical 9:16 exacto del video */}
              <div className="relative aspect-[9/16] w-full bg-[#7f6c51]">
                <video
                  ref={videoRef}
                  src={VIDEO_SRC}
                  autoPlay
                  playsInline
                  loop
                  preload="auto"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onLoadedMetadata={(e) => {
                    const vid = e.currentTarget;
                    if (vid.duration && Number.isFinite(vid.duration)) {
                      setDuration(vid.duration);
                    }
                  }}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onClick={handleTogglePlay}
                  className="h-full w-full cursor-pointer object-cover"
                />

                {/* Controles superiores flotantes sobre el video */}
                <div className="pointer-events-none absolute top-3 right-3 left-3 z-20 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    aria-label={isMuted ? 'Activar música' : 'Silenciar música'}
                    className="pointer-events-auto touch-manipulation inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-[#fdfbf7]/35 bg-[#2d1e18]/68 px-3.5 py-2 text-xs font-medium whitespace-nowrap text-[#fdfbf7] backdrop-blur-md transition-all duration-150 hover:bg-[#2d1e18]/85 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[#fdfbf7] cursor-pointer"
                  >
                    {isMuted ? (
                      <>
                        <VolumeX className="h-4 w-4 text-[#e5c98b]" />
                        <span>Activar música</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4 text-[#e5c98b]" />
                        <span>Música sonando</span>
                      </>
                    )}
                  </button>

                  <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      aria-label={isPlaying ? 'Pausar video' : 'Reproducir video'}
                      className="touch-manipulation inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#fdfbf7]/35 bg-[#2d1e18]/68 text-[#fdfbf7] backdrop-blur-md transition-all duration-150 hover:bg-[#2d1e18]/85 active:scale-[0.97] cursor-pointer"
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleReplay}
                      aria-label="Reiniciar video"
                      className="touch-manipulation inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#fdfbf7]/35 bg-[#2d1e18]/68 text-[#fdfbf7] backdrop-blur-md transition-all duration-150 hover:bg-[#2d1e18]/85 active:scale-[0.97] cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Sombreado oscuro inferior permanente para que el borde bajo del video nunca se mezcle con el blanco */}
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-[#1f130e]/85 via-[#2d1e18]/38 to-transparent"
                  aria-hidden="true"
                />

                {/* Barra de progreso interactiva inferior */}
                <div className="absolute right-0 bottom-0 left-0 z-20 px-4 pt-6 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums-strict text-[11px] font-medium text-[#fdfbf7]/95">
                      {formatTime(currentTime)}
                    </span>
                    <div className="relative flex flex-1 items-center">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-[#fdfbf7]/25">
                        <div
                          className="h-full bg-[#e5c98b] transition-[width] duration-150"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={duration || 30}
                        step={0.1}
                        value={currentTime}
                        onChange={handleScrub}
                        aria-label="Progreso del video"
                        className="absolute -inset-y-2 inset-x-0 h-8 w-full cursor-pointer opacity-0"
                      />
                    </div>
                    <span className="tabular-nums-strict text-[11px] font-medium text-[#fdfbf7]/80">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* COLUMNA DERECHA: TARJETA EN PAPEL ALGODÓN TEXTURIZADO CON PARTE INFERIOR MÁS OSCURA */}
          <section className="relative z-10 mx-auto w-full max-w-xl lg:max-w-none">
            <div className="paper-cotton-surface paper-card-elevation relative overflow-hidden rounded-2xl border border-[#8c785b]/30">
              {/* Marco fino interior tipo papelería impresa en relieve (sin dibujos tipo caricatura) */}
              <div
                className="pointer-events-none absolute inset-2.5 z-10 rounded-xl border border-[#8c785b]/16 sm:inset-3.5"
                aria-hidden="true"
              />

              <div className="relative z-20 p-6 sm:p-8 lg:p-10">
                {/* Encabezado limpio */}
                <div className="pb-6 text-center lg:text-left">
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium tracking-[0.16em] text-[#6c594e] uppercase lg:justify-start">
                    <span>NUESTRA BODA CIVIL</span>
                  </div>

                  <h1 className="font-script letterpress-ink text-balance mt-3 text-[3.1rem] leading-none text-[#4f2a1d] sm:text-6xl">
                    José &amp; Karla
                  </h1>

                  <p className="font-editorial mt-4 text-lg leading-relaxed text-[#4b3a32] italic sm:text-xl">
                    Con la certeza de haber encontrado nuestro hogar el uno en el otro, tenemos el honor de invitarte a celebrar nuestra boda civil.
                  </p>
                </div>

                <div className="gold-foil-rule" aria-hidden="true" />

                {/* CUENTA REGRESIVA EN TIEMPO REAL */}
                <div id="cuenta-regresiva" className="py-6">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h2 className="font-editorial text-balance text-xl font-semibold tracking-wide text-[#4f2a1d]">
                      {countdown.isPast ? '¡Hoy celebramos nuestro amor!' : 'Cuenta regresiva para el gran día'}
                    </h2>
                    <span className="tabular-nums-strict shrink-0 text-xs font-medium text-[#6c594e]">19 · 12 · 26</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 sm:gap-4">
                    <div className="paper-insert-slip rounded-xl border border-[#c59b27]/35 px-1.5 py-3.5 text-center sm:px-2 sm:py-4">
                      <div className="font-editorial letterpress-ink tabular-nums-strict text-[26px] leading-none font-semibold text-[#4f2a1d] sm:text-4xl">
                        {padTwo(countdown.days)}
                      </div>
                      <div className="mt-1.5 text-[10px] font-medium tracking-[0.06em] text-[#6c594e] uppercase sm:text-[11px] sm:tracking-wider">
                        Días
                      </div>
                    </div>

                    <div className="paper-insert-slip rounded-xl border border-[#c59b27]/35 px-1.5 py-3.5 text-center sm:px-2 sm:py-4">
                      <div className="font-editorial letterpress-ink tabular-nums-strict text-[26px] leading-none font-semibold text-[#4f2a1d] sm:text-4xl">
                        {padTwo(countdown.hours)}
                      </div>
                      <div className="mt-1.5 text-[10px] font-medium tracking-[0.06em] text-[#6c594e] uppercase sm:text-[11px] sm:tracking-wider">
                        Horas
                      </div>
                    </div>

                    <div className="paper-insert-slip rounded-xl border border-[#c59b27]/35 px-1.5 py-3.5 text-center sm:px-2 sm:py-4">
                      <div className="font-editorial letterpress-ink tabular-nums-strict text-[26px] leading-none font-semibold text-[#4f2a1d] sm:text-4xl">
                        {padTwo(countdown.minutes)}
                      </div>
                      <div className="mt-1.5 text-[10px] font-medium tracking-[0.06em] text-[#6c594e] uppercase sm:text-[11px] sm:tracking-wider">
                        Minutos
                      </div>
                    </div>

                    <div className="paper-insert-slip rounded-xl border border-[#c59b27]/35 px-1.5 py-3.5 text-center sm:px-2 sm:py-4">
                      <div className="font-editorial letterpress-ink tabular-nums-strict text-[26px] leading-none font-semibold text-[#4f2a1d] sm:text-4xl">
                        {padTwo(countdown.seconds)}
                      </div>
                      <div className="mt-1.5 text-[10px] font-medium tracking-[0.06em] text-[#6c594e] uppercase sm:text-[11px] sm:tracking-wider">
                        Segundos
                      </div>
                    </div>
                  </div>
                </div>

                <div className="gold-foil-rule" aria-hidden="true" />

                {/* ACCIONES PRINCIPALES: GOOGLE MAPS DIRECTO Y ASISTENCIA (COLOR BEIGE DEL VIDEO) */}
                <div id="ubicacion" className="py-6">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <a
                      href={GOOGLE_MAPS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="touch-manipulation inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#8c785b] px-4 py-3 text-[13px] font-semibold text-[#fdfbf7] shadow-[0_4px_12px_rgba(79,42,29,0.22)] transition-all duration-150 hover:bg-[#77654b] active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c785b] sm:px-5 sm:text-sm"
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-[#f5ecd9]" />
                      <span className="whitespace-nowrap">Ver Dirección en Google Maps</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    </a>

                    <button
                      type="button"
                      onClick={() => setIsRsvpOpen(true)}
                      className="touch-manipulation inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl border border-[#8c785b]/55 bg-[#efe7da] px-4 py-3 text-[13px] font-semibold text-[#423222] shadow-[0_2px_8px_rgba(79,42,29,0.08)] transition-all duration-150 hover:bg-[#e5dbc9] active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c785b] cursor-pointer sm:px-5 sm:text-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#8c785b]" />
                      <span className="whitespace-nowrap">
                        {savedRsvp ? 'Actualizar Asistencia' : 'Confirmar Asistencia'}
                      </span>
                    </button>
                  </div>

                  {/* Confirmación guardada visible */}
                  {savedRsvp && (
                    <div className="paper-insert-slip mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#8c785b]/40 px-4 py-3 text-xs text-[#2d1e18]">
                      <div className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 shrink-0 text-[#8c785b]" />
                        <span>
                          <strong>{savedRsvp.name}</strong>:{' '}
                          {savedRsvp.attending === 'yes'
                            ? 'Asistencia confirmada'
                            : 'Indicaste que no podrás asistir'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsRsvpOpen(true)}
                        className="touch-manipulation min-h-[36px] px-1 font-semibold text-[#6d5b42] underline underline-offset-2 whitespace-nowrap cursor-pointer"
                      >
                        Editar
                      </button>
                    </div>
                  )}

                  {/* Acción secundaria: Agregar al calendario */}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(true)}
                      className="touch-manipulation inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#8c785b]/40 bg-[#f6f0e6] px-4 py-2 text-xs font-semibold text-[#5c4b36] transition-all duration-150 hover:bg-[#ede4d4] active:scale-[0.985] cursor-pointer"
                    >
                      <CalendarPlus className="h-4 w-4 text-[#8c785b]" />
                      <span>Agregar al calendario</span>
                    </button>
                  </div>
                </div>

                <div className="gold-foil-rule" aria-hidden="true" />

                {/* ITINERARIO Y DETALLES DEL VIDEO */}
                <div id="itinerario" className="pt-6">
                  <h2 className="font-editorial text-balance text-xl font-semibold text-[#4f2a1d]">
                    Detalles de la Celebración
                  </h2>

                  <div className="mt-4 space-y-4 text-sm text-[#4b3a32]">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#b8860b]" />
                      <div>
                        <div className="font-semibold text-[#2d1e18]">Ceremonia — Molino Del Puente</div>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#6c594e]">
                          Km 14 ½ Vía Cuenca – Molleturo (camino al Parque Nacional Cajas), Cuenca, Azuay,
                          Ecuador.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#b8860b]" />
                      <div>
                        <div className="font-semibold text-[#2d1e18]">Recepción — 13:30 PM</div>
                        <p className="mt-0.5 text-xs text-[#6c594e]">Salón Rosa Bella · Sábado 19 de Diciembre 2026</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Shirt className="mt-0.5 h-4 w-4 shrink-0 text-[#b8860b]" />
                      <div>
                        <div className="font-semibold text-[#2d1e18]">Código de Vestimenta</div>
                        <p className="mt-0.5 text-xs text-[#6c594e]">Formal</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parte inferior en cartulina espresso oscurecida para contraste limpio contra el fondo blanco */}
              <div className="paper-espresso-band relative z-20 border-t border-[#c59b27]/35 px-6 py-5 text-center sm:px-8 lg:px-10 lg:text-left">
                <p className="font-editorial text-lg text-[#fdfbf7] italic">
                  Los momentos más felices de la vida se disfrutan más junto a quienes queremos. ¡Te esperamos!
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* MODAL INTERACTIVO DE CONFIRMACIÓN DE ASISTENCIA (SIN NÚMERO DE PERSONAS) */}
      {isRsvpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#2d1e18]/60 p-0 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsRsvpOpen(false);
          }}
        >
          <div className="paper-cotton-surface w-full max-w-md rounded-t-3xl border border-[#c59b27]/35 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:pb-6">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#4f2a1d]/20 sm:hidden" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-editorial text-2xl font-semibold text-[#4f2a1d]">
                  Confirmar Asistencia
                </h3>
                <p className="mt-1 text-xs text-[#6c594e]">
                  Sábado 19 de Diciembre 2026 · 13:30 PM · Molino Del Puente
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRsvpOpen(false)}
                aria-label="Cerrar ventana"
                className="touch-manipulation inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#6c594e] hover:bg-[#f4f2ed] hover:text-[#2d1e18] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRsvpSubmit} noValidate className="mt-5 space-y-4">
              <div>
                <label htmlFor="guest-name" className="block text-xs font-semibold text-[#2d1e18]">
                  Nombre completo
                </label>
                <input
                  ref={nameInputRef}
                  id="guest-name"
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => {
                    setGuestName(e.target.value);
                    if (nameError && e.target.value.trim()) setNameError(null);
                  }}
                  placeholder="Ej. María Fernanda Torres"
                  aria-invalid={Boolean(nameError)}
                  className={`mt-1.5 min-h-[46px] w-full rounded-xl border bg-[#fdfbf7] px-3.5 py-2.5 text-base text-[#2d1e18] placeholder:text-[#6c594e]/60 focus:outline-none sm:text-sm ${
                    nameError
                      ? 'border-[#b91c1c] focus:border-[#b91c1c]'
                      : 'border-[#4f2a1d]/20 focus:border-[#8c785b]'
                  }`}
                />
                {nameError && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-[#b91c1c]">
                    {nameError}
                  </p>
                )}
              </div>

              <div>
                <span className="block text-xs font-semibold text-[#2d1e18]">¿Nos acompañarás?</span>
                <div className="mt-1.5 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAttending('yes')}
                    className={`touch-manipulation min-h-[44px] rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      attending === 'yes'
                        ? 'border-[#8c785b] bg-[#8c785b] text-[#fdfbf7]'
                        : 'border-[#8c785b]/35 bg-[#f6f0e6] text-[#5c4b36]'
                    }`}
                  >
                    Sí, asistiré
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttending('no')}
                    className={`touch-manipulation min-h-[44px] rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      attending === 'no'
                        ? 'border-[#8c785b] bg-[#8c785b] text-[#fdfbf7]'
                        : 'border-[#8c785b]/35 bg-[#f6f0e6] text-[#5c4b36]'
                    }`}
                  >
                    No podré asistir
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="guest-note" className="block text-xs font-semibold text-[#2d1e18]">
                  Mensaje para los novios (opcional)
                </label>
                <textarea
                  id="guest-note"
                  rows={2}
                  value={guestNote}
                  onChange={(e) => setGuestNote(e.target.value)}
                  placeholder="¡Muchas felicidades José y Karla!"
                  className="mt-1.5 w-full rounded-xl border border-[#4f2a1d]/20 bg-[#fdfbf7] px-3.5 py-2.5 text-base text-[#2d1e18] placeholder:text-[#6c594e]/60 focus:border-[#8c785b] focus:outline-none sm:text-sm"
                />
              </div>

              <button
                type="submit"
                className="touch-manipulation inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#8c785b] px-4 py-3 text-sm font-semibold text-[#fdfbf7] shadow-md transition-all duration-150 hover:bg-[#77654b] active:scale-[0.985] cursor-pointer"
              >
                <MessageCircle className="h-4 w-4 text-[#f5ecd9]" />
                <span>Confirmar Asistencia por WhatsApp</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR AL CALENDARIO */}
      {isCalendarOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#2d1e18]/60 p-0 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCalendarOpen(false);
          }}
        >
          <div className="paper-cotton-surface w-full max-w-sm rounded-t-3xl border border-[#c59b27]/35 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:pb-6">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#4f2a1d]/20 sm:hidden" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-editorial text-2xl font-semibold text-[#4f2a1d]">
                  Guardar Fecha
                </h3>
                <p className="mt-1 text-xs text-[#6c594e]">
                  Sábado 19 de Diciembre de 2026 · 13:30 PM
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCalendarOpen(false)}
                aria-label="Cerrar calendario"
                className="touch-manipulation inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#6c594e] hover:bg-[#f4f2ed] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-2.5">
              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsCalendarOpen(false)}
                className="touch-manipulation inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[#8c785b]/50 bg-[#efe7da] px-4 py-3 text-sm font-semibold text-[#423222] transition-all duration-150 hover:bg-[#e5dbc9] active:scale-[0.985]"
              >
                <CalendarPlus className="h-4 w-4 text-[#8c785b]" />
                <span>Google Calendar</span>
              </a>

              <button
                type="button"
                onClick={handleDownloadIcs}
                className="touch-manipulation inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#8c785b] px-4 py-3 text-sm font-semibold text-[#fdfbf7] transition-all duration-150 hover:bg-[#77654b] active:scale-[0.985] cursor-pointer"
              >
                <Download className="h-4 w-4 text-[#f5ecd9]" />
                <span>Descargar archivo .ics (Apple / Outlook)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificación Toast */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl border border-[#c59b27]/50 bg-[#2d1e18] px-4 py-2.5 text-xs font-medium text-[#fdfbf7] shadow-xl"
        >
          <Check className="h-3.5 w-3.5 shrink-0 text-[#e5c98b]" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
