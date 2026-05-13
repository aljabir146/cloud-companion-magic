import { useEffect, useRef } from "react";

/**
 * Animated Minecraft NATURE biome background.
 * - Sunset/day sky with drifting clouds
 * - Parallax pixel hills (forest greens)
 * - Pixel oak trees with swaying leaves
 * - Floating fireflies / butterflies
 * - Soft sun glow
 * Pure canvas, no images.
 */
export function MinecraftBackground({ dim = 0.35 }: { dim?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Cloud = { x: number; y: number; s: number; v: number };
    type Bug = { x: number; y: number; phase: number; hue: number; v: number };
    type Tree = { x: number; baseY: number; scale: number; sway: number };

    let clouds: Cloud[] = [];
    let bugs: Bug[] = [];
    let trees: Tree[] = [];

    function resize() {
      if (!canvas) return;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cCount = Math.max(4, Math.floor(w / 260));
      clouds = Array.from({ length: cCount }, () => ({
        x: Math.random() * w,
        y: 30 + Math.random() * (h * 0.35),
        s: 0.6 + Math.random() * 1.2,
        v: 0.08 + Math.random() * 0.15,
      }));

      const bCount = Math.floor((w * h) / 22000);
      bugs = Array.from({ length: bCount }, () => ({
        x: Math.random() * w,
        y: h * 0.4 + Math.random() * (h * 0.45),
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.5 ? 50 : Math.random() < 0.5 ? 20 : 320,
        v: 0.2 + Math.random() * 0.4,
      }));

      const tCount = Math.max(4, Math.floor(w / 220));
      trees = Array.from({ length: tCount }, (_, i) => ({
        x: (w / tCount) * i + (Math.random() * 60 - 30) + 30,
        baseY: h - 28,
        scale: 0.85 + Math.random() * 0.6,
        sway: Math.random() * Math.PI * 2,
      }));
    }

    function pxRect(x: number, y: number, ww: number, hh: number, color: string) {
      ctx!.fillStyle = color;
      ctx!.fillRect(Math.floor(x), Math.floor(y), Math.ceil(ww), Math.ceil(hh));
    }

    function drawHills(layer: number, color: string, baseY: number, amp: number, step: number, t: number) {
      ctx!.fillStyle = color;
      ctx!.beginPath();
      ctx!.moveTo(0, h);
      const drift = (t * 0.005 * (layer + 1)) % step;
      for (let x = -step; x <= w + step; x += step) {
        const px = x - drift;
        const y =
          baseY +
          Math.sin(px * 0.01 + layer * 1.7) * amp +
          Math.sin(px * 0.035 + layer) * (amp * 0.35);
        ctx!.lineTo(px, Math.floor(y / step) * step);
        ctx!.lineTo(px + step, Math.floor(y / step) * step);
      }
      ctx!.lineTo(w, h);
      ctx!.closePath();
      ctx!.fill();
    }

    function drawCloud(c: Cloud) {
      const x = c.x, y = c.y, s = c.s;
      const block = 8 * s;
      const layout = [
        [0,1,1,1,1,0],
        [1,1,1,1,1,1],
        [0,1,1,1,1,0],
      ];
      for (let r = 0; r < layout.length; r++) {
        for (let cc = 0; cc < layout[r].length; cc++) {
          if (layout[r][cc]) {
            pxRect(x + cc * block, y + r * block, block + 0.5, block + 0.5, "rgba(255,255,255,0.92)");
          }
        }
      }
    }

    function drawTree(tr: Tree, t: number) {
      const sway = Math.sin(t * 0.001 + tr.sway) * 1.5;
      const x = tr.x + sway;
      const y = tr.baseY;
      const s = tr.scale;
      const blk = Math.max(3, Math.round(4 * s));
      // trunk
      pxRect(x - blk, y - 18 * s, blk * 2, 22 * s, "#5a3a1f");
      pxRect(x - blk + 1, y - 18 * s, blk - 1, 22 * s, "#7a4d28");
      // leaves cluster (pixel canopy)
      const canopy = [
        [0,1,1,1,1,1,0],
        [1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1],
        [0,1,1,1,1,1,0],
        [0,0,1,1,1,0,0],
      ];
      const cx = x - (canopy[0].length / 2) * blk;
      const cy = y - 18 * s - canopy.length * blk + 4;
      for (let r = 0; r < canopy.length; r++) {
        for (let cc = 0; cc < canopy[r].length; cc++) {
          if (!canopy[r][cc]) continue;
          const shade = (r + cc) % 3;
          const col = shade === 0 ? "#3f8f3a" : shade === 1 ? "#4fa544" : "#2f6b2c";
          pxRect(cx + cc * blk, cy + r * blk, blk + 0.5, blk + 0.5, col);
        }
      }
    }

    function frame(t: number) {
      ctx!.clearRect(0, 0, w, h);

      // Sky — soft sunset/day
      const sky = ctx!.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#ffb877");
      sky.addColorStop(0.35, "#ffd58a");
      sky.addColorStop(0.7, "#a9d8ff");
      sky.addColorStop(1, "#cfeaff");
      ctx!.fillStyle = sky;
      ctx!.fillRect(0, 0, w, h);

      // Sun
      const sunX = w * 0.78, sunY = h * 0.22;
      const halo = ctx!.createRadialGradient(sunX, sunY, 4, sunX, sunY, 220);
      halo.addColorStop(0, "rgba(255, 240, 180, 0.9)");
      halo.addColorStop(0.4, "rgba(255, 180, 90, 0.35)");
      halo.addColorStop(1, "rgba(255, 140, 60, 0)");
      ctx!.fillStyle = halo;
      ctx!.fillRect(sunX - 220, sunY - 220, 440, 440);
      // pixel sun disc
      const sunR = 26;
      for (let yy = -sunR; yy <= sunR; yy += 4) {
        const ww2 = Math.floor(Math.sqrt(sunR * sunR - yy * yy));
        pxRect(sunX - ww2, sunY + yy, ww2 * 2, 4, "#fff1b0");
      }

      // Clouds
      for (const c of clouds) {
        c.x += c.v;
        if (c.x > w + 80) c.x = -120;
        drawCloud(c);
      }

      // Distant hills (soft blue)
      drawHills(0, "#7fb6c9", h * 0.62, 32, 14, t);
      drawHills(1, "#5b9d8f", h * 0.72, 36, 12, t);
      // Foreground green hills
      drawHills(2, "#3f8f3a", h * 0.84, 30, 10, t);

      // Grass strip
      pxRect(0, h - 28, w, 28, "#3f8f3a");
      // grass top blades
      for (let x = 0; x < w; x += 4) {
        const k = (x * 31) % 7;
        pxRect(x, h - 28 - (k > 4 ? 2 : 0), 2, 2, "#5fbf4d");
      }
      // dirt
      pxRect(0, h - 6, w, 6, "#6b3f1f");

      // Trees
      for (const tr of trees) drawTree(tr, t);

      // Fireflies / butterflies
      for (const b of bugs) {
        b.phase += 0.04;
        b.x += Math.cos(b.phase) * b.v;
        b.y += Math.sin(b.phase * 1.3) * b.v * 0.6;
        if (b.x < 0) b.x = w; if (b.x > w) b.x = 0;
        if (b.y < h * 0.3) b.y = h * 0.3; if (b.y > h - 40) b.y = h - 40;
        const a = 0.55 + Math.sin(t * 0.01 + b.phase) * 0.4;
        ctx!.fillStyle = `hsla(${b.hue}, 95%, 65%, ${a})`;
        ctx!.fillRect(b.x, b.y, 3, 3);
        ctx!.fillStyle = `hsla(${b.hue}, 95%, 80%, ${a * 0.4})`;
        ctx!.fillRect(b.x - 2, b.y - 1, 7, 5);
      }

      // Warm dim overlay
      ctx!.fillStyle = `rgba(20, 14, 30, ${dim})`;
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
