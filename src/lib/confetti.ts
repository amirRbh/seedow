/**
 * Confettis or sobres — 12 particules dorées, 1.2 s, canvas léger.
 * Respect strict de `prefers-reduced-motion`.
 */

const GOLD = ["#c9a84c", "#e8c87a", "#a88838", "#f0d78c"];

export function fireConfetti(origin?: { x: number; y: number }) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const ox = origin?.x ?? w / 2;
  const oy = origin?.y ?? h / 2;

  type P = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; color: string; size: number };
  const particles: P[] = Array.from({ length: 12 }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
    const speed = 380 + Math.random() * 260;
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 8,
      color: GOLD[Math.floor(Math.random() * GOLD.length)],
      size: 5 + Math.random() * 3,
    };
  });

  const start = performance.now();
  const DURATION = 1200;
  const GRAVITY = 1200;

  let raf = 0;
  const tick = (now: number) => {
    const t = (now - start) / 1000;
    const elapsed = now - start;
    if (elapsed > DURATION) {
      cancelAnimationFrame(raf);
      canvas.remove();
      return;
    }
    ctx.clearRect(0, 0, w, h);
    const alpha = Math.max(0, 1 - elapsed / DURATION);
    for (const p of particles) {
      const x = p.x + p.vx * t;
      const y = p.y + p.vy * t + 0.5 * GRAVITY * t * t;
      const rot = p.rot + p.vr * t;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
