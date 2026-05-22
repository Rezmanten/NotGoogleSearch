// wander.jsx — Human-like cursor wander hook
const { useEffect: __useEffect } = React;

// ─── Human-ish wander engine ─────────────────────────────────────────
// Phases:
//   sweep — broad cubic-bezier curve from current position to a new target area
//   hover — small noisy circles/drift over the target before picking the next one
// onTick is a RAF loop driving the cursor pos via setPos (no CSS transition).
window.useCursorWander = function useCursorWander({ active, getTargetCenters, params, setPos, lastPosRef }) {
  __useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let raf = 0;
    const state = {
      phase: 'sweep',
      phaseStart: performance.now(),
      phaseDur: params.wanderSweepMs,
      curve: null,
      hoverCenter: null,
      seed: Math.random() * 1000,
    };

    const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const pickTarget = () => {
      const centers = getTargetCenters() || [];
      if (!centers.length) return null;
      // avoid picking the exact same spot twice
      let pick;
      for (let i = 0; i < 4; i++) {
        pick = centers[Math.floor(Math.random() * centers.length)];
        if (!state.hoverCenter || Math.hypot(pick.x - state.hoverCenter.x, pick.y - state.hoverCenter.y) > 80) break;
      }
      // jitter the landing spot a bit so we don't always hit dead center
      return {
        x: pick.x + (Math.random() - 0.5) * Math.min(pick.w || 120, 120),
        y: pick.y + (Math.random() - 0.5) * Math.min(pick.h || 24, 24),
      };
    };

    const startSweep = () => {
      const target = pickTarget();
      if (!target) {
        state.phase = 'idle';
        return;
      }
      const from = lastPosRef.current;
      const dx = target.x - from.x;
      const dy = target.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      const perpX = -dy / len;
      const perpY = dx / len;
      // random curve offset on each control point — sometimes opposite sides for an S-curve
      const c = params.wanderCurviness;
      const off1 = (Math.random() - 0.5) * len * c;
      const off2 = (Math.random() - 0.5) * len * c;
      state.curve = {
        p0: { ...from },
        p1: { x: from.x + dx * 0.33 + perpX * off1, y: from.y + dy * 0.33 + perpY * off1 },
        p2: { x: from.x + dx * 0.66 + perpX * off2, y: from.y + dy * 0.66 + perpY * off2 },
        p3: target,
      };
      state.phase = 'sweep';
      state.phaseStart = performance.now();
      // longer sweeps for longer distances, with variance
      state.phaseDur = params.wanderSweepMs * (0.6 + Math.min(1.4, len / 600)) * (0.85 + Math.random() * 0.3);
    };

    const startHover = () => {
      state.hoverCenter = { ...state.curve.p3 };
      state.phase = 'hover';
      state.phaseStart = performance.now();
      state.phaseDur = params.wanderHoverMs * (0.7 + Math.random() * 0.6);
      state.seed = Math.random() * 1000;
    };

    startSweep();

    const tick = (now) => {
      if (cancelled) return;
      const t = Math.min(1, (now - state.phaseStart) / state.phaseDur);
      let p;
      if (state.phase === 'sweep') {
        const u = easeInOut(t);
        const mt = 1 - u;
        const { p0, p1, p2, p3 } = state.curve;
        const x = mt ** 3 * p0.x + 3 * mt * mt * u * p1.x + 3 * mt * u * u * p2.x + u ** 3 * p3.x;
        const y = mt ** 3 * p0.y + 3 * mt * mt * u * p1.y + 3 * mt * u * u * p2.y + u ** 3 * p3.y;
        p = { x, y };
        if (t >= 1) startHover();
      } else if (state.phase === 'hover') {
        const e = (now - state.phaseStart) / 1000;
        const r = params.wanderJitterPx;
        // two-frequency Lissajous gives an organic wobble
        const a = e * 1.7 + state.seed;
        const b = e * 0.83 + state.seed * 1.3;
        const ox = Math.cos(a) * r + Math.sin(b * 1.6) * r * 0.45;
        const oy = Math.sin(a * 1.1) * r * 0.85 + Math.cos(b) * r * 0.4;
        p = { x: state.hoverCenter.x + ox, y: state.hoverCenter.y + oy };
        if (t >= 1) startSweep();
      } else {
        p = lastPosRef.current;
      }
      lastPosRef.current = p;
      setPos(p);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelled = true; if (raf) cancelAnimationFrame(raf); };
  }, [active, params.wanderSweepMs, params.wanderHoverMs, params.wanderJitterPx, params.wanderCurviness]);
}

