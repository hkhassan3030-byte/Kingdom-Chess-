import { useEffect, useRef } from 'react';

interface PerfState {
  frames: number;
  accumMs: number;
  renderMsSum: number;
  maxFrameMs: number;
  longFrames: number;
  fps: number;
  avgFrameMs: number;
  avgRenderMs: number;
  drawCalls: number;
  triangles: number;
  lastAiMs: number;
  maxAiMs: number;
}

const state: PerfState = {
  frames: 0,
  accumMs: 0,
  renderMsSum: 0,
  maxFrameMs: 0,
  longFrames: 0,
  fps: 60,
  avgFrameMs: 16.7,
  avgRenderMs: 0,
  drawCalls: 0,
  triangles: 0,
  lastAiMs: 0,
  maxAiMs: 0,
};

export function recordFrameMetrics(
  frameMs: number,
  renderMs: number,
  drawCalls: number,
  triangles: number
) {
  if (!import.meta.env.DEV) return;
  state.frames++;
  state.accumMs += frameMs;
  state.renderMsSum += renderMs;
  if (frameMs > state.maxFrameMs) state.maxFrameMs = frameMs;
  if (frameMs > 20) state.longFrames++;
  state.drawCalls = drawCalls;
  state.triangles = triangles;

  if (state.accumMs >= 500) {
    state.fps = Math.round((state.frames * 1000) / state.accumMs);
    state.avgFrameMs = state.accumMs / state.frames;
    state.avgRenderMs = state.renderMsSum / state.frames;
    state.frames = 0;
    state.accumMs = 0;
    state.renderMsSum = 0;
    state.maxFrameMs = 0;
  }
}

export function recordAIMetrics(aiMs: number) {
  if (!import.meta.env.DEV) return;
  state.lastAiMs = aiMs;
  if (aiMs > state.maxAiMs) state.maxAiMs = aiMs;
}

/**
 * Lightweight DEVELOPMENT-ONLY performance overlay.
 * Updates directly via DOM ref at 2 Hz so it causes zero React re-renders.
 * Never rendered in production builds.
 */
export function DevPerfOverlay() {
  const textRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const id = window.setInterval(() => {
      const el = textRef.current;
      if (!el) return;
      el.textContent =
        `FPS ${state.fps} | ` +
        `frame ${state.avgFrameMs.toFixed(1)}ms | ` +
        `render ${state.avgRenderMs.toFixed(1)}ms | ` +
        `draws ${state.drawCalls} | ` +
        `long ${state.longFrames} | ` +
        `AI ${state.lastAiMs.toFixed(0)}ms`;
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  if (!import.meta.env.DEV) return null;

  return (
    <div
      ref={textRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-2 top-16 z-50 rounded-lg border border-emerald-400/30 bg-black/75 px-2.5 py-1 font-mono text-[10px] text-emerald-300 shadow"
    >
      FPS -- | frame -- | render -- | draws --
    </div>
  );
}
