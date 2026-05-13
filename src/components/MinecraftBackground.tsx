import { useEffect, useRef } from "react";

/**
 * Animated night-biome Minecraft background.
 * - Pixelated parallax mountains
 * - Falling snow particles
 * - Flickering torches
 * - Drifting aurora
 * Pure canvas, no images.
 */
export function MinecraftBackground({ dim = 0.4 }: { dim?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Flake = { x: number; y: number; r: number; vy: number; vx: number; o: number };
    let flakes: Flake[] = [];

    const torches: { x: number; y: number; phase: number }[] = [];

    function resize() {
      if (!canvas) return;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      // populate flakes
      const count = Math.floor((w * h) / 9000);
      flakes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.8 + Math.random() * 1.8,
        vy: 0.15 + Math.random() * 0.6,
        vx: -0.2 + Math.random() * 0.4,
        o: 0.4 + Math.random() * 0.6,
      }));
      // torches roughly across base
      torches.length = 0;
      const tCount = Math.max(3, Math.floor(w / 320));
      for (let i = 0; i < tCount; i++) {
        torches.push({
          x: (w / (tCount + 1)) * (i + 1) + (Math.random() * 40 - 20),
          y: h - 60 - Math.random() * 80,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    // pixelated mountain layer cache
    function drawMountains(layer: number, color: string, baseY: number, amp: number, step: number, t: number) {
      ctx!.fillStyle = color;
      ctx!.beginPath();
      ctx!.moveTo(0, h);
      const drift = (t * 0.005 * (layer + 1)) % step;
      for (let x = -step; x <= w + step; x += step) {
        const px = x - drift;
        const y =
          baseY +
          Math.sin(px * 0.012 + layer * 1.7) * amp +
          Math.sin(px * 0.04 + layer) * (amp * 0.3);
        ctx!.lineTo(px, Math.floor(y / step) * step);
        ctx!.lineTo(px + step, Math.floor(y / step) * step);
      }
      ctx!.lineTo(w, h);
      ctx!.closePath();
      ctx!.fill();
    }

    function drawTorch(x: number, y: number, t: number, phase: number) {
      const flick = 0.7 + Math.sin(t * 0.02 + phase) * 0.15 + Math.random() * 0.15;
      // halo
      const grad = ctx!.createRadialGradient(x, y, 2, x, y, 90 * flick);
      grad.addColorStop(0, `rgba(255, 190, 90, ${0.55 * flick})`);
      grad.addColorStop(0.4, `rgba(255, 130, 40, ${0.18 * flick})`);
      grad.addColorStop(1, "rgba(255, 100, 30, 0)");
      ctx!.fillStyle = grad;
      ctx!.fillRect(x - 100, y - 100, 200, 200);
      // stick
      ctx!.fillStyle = "#3a2a16";
      ctx!.fillRect(x - 2, y, 4, 22);
      // flame pixels
      ctx!.fillStyle = `rgba(255, 220, 120, ${flick})`;
      ctx!.fillRect(x - 4, y - 8, 8, 8);
      ctx!.fillStyle = `rgba(255, 150, 40, ${flick})`;
      ctx!.fillRect(x - 3, y - 4, 6, 6);
      ctx!.fillStyle = `rgba(255, 90, 20, ${flick * 0.9})`;
      ctx!.fillRect(x - 2, y - 2, 4, 4);
    }

    function frame(t: number) {
      ctx!.clearRect(0, 0, w, h);

      // Sky gradient
      const sky = ctx!.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#070a17");
      sky.addColorStop(0.5, "#0d1330");
      sky.addColorStop(1, "#1a1f44");
      ctx!.fillStyle = sky;
      ctx!.fillRect(0, 0, w, h);

      // Stars
      ctx!.fillStyle = "rgba(255,255,255,0.7)";
      for (let i = 0; i < 60; i++) {
        const sx = (i * 977) % w;
        const sy = (i * 613) % (h * 0.55);
        const tw = 0.5 + Math.sin(t * 0.003 + i) * 0.5;
        ctx!.globalAlpha = 0.3 + tw * 0.5;
        ctx!.fillRect(sx, sy, 1.5, 1.5);
      }
      ctx!.globalAlpha = 1;

      // Mountains (pixelated, parallax)
      drawMountains(0, "#1a2347", h * 0.65, 60, 18, t);
      drawMountains(1, "#131a36", h * 0.78, 50, 14, t);
      drawMountains(2, "#0d1228", h * 0.88, 40, 10, t);

      // Snow ground line
      ctx!.fillStyle = "#e8eefc";
      ctx!.fillRect(0, h - 22, w, 22);
      ctx!.fillStyle = "#9aa9d4";
      for (let x = 0; x < w; x += 6) {
        ctx!.fillRect(x, h - 22, 3, 3);
      }

      // Torches
      for (const tr of torches) drawTorch(tr.x, tr.y, t, tr.phase);

      // Snow
      ctx!.fillStyle = "#ffffff";
      for (const f of flakes) {
        f.y += f.vy;
        f.x += f.vx + Math.sin((f.y + t * 0.05) * 0.01) * 0.3;
        if (f.y > h) { f.y = -4; f.x = Math.random() * w; }
        if (f.x < -4) f.x = w + 4;
        if (f.x > w + 4) f.x = -4;
        ctx!.globalAlpha = f.o;
        ctx!.fillRect(f.x, f.y, f.r, f.r);
      }
      ctx!.globalAlpha = 1;

      // Dim overlay
      ctx!.fillStyle = `rgba(7, 10, 23, ${dim})`;
      ctx!.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [dim]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="aurora-band" />
    </div>
  );
}
