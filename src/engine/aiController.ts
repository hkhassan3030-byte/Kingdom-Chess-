import { selectAIMoveWithInsight, type AIMoveResult } from './chessAI';
import { recordAIMetrics } from '../utils/devPerfMonitor';
import type { AIDifficulty } from '../types/chess';

interface PendingTask {
  resolve: (result: AIMoveResult | null) => void;
}

let workerInstance: Worker | null = null;
let workerFailed = false;
let workerInFlightCount = 0;
let nextId = 1;
const pending = new Map<number, PendingTask>();

function resetWorker() {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
  workerInFlightCount = 0;
}

function getWorker(): Worker | null {
  if (workerFailed || typeof Worker === 'undefined') return null;
  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL('./chessAI.worker.ts', import.meta.url), {
        type: 'module',
      });
      workerInstance.onmessage = (
        e: MessageEvent<{ id: number; result: AIMoveResult | null }>
      ) => {
        workerInFlightCount = Math.max(0, workerInFlightCount - 1);
        const task = pending.get(e.data.id);
        if (task) {
          pending.delete(e.data.id);
          task.resolve(e.data.result);
        }
      };
      workerInstance.onerror = () => {
        workerFailed = true;
        resetWorker();
        pending.forEach((t) => t.resolve(null));
        pending.clear();
      };
    } catch {
      workerFailed = true;
      return null;
    }
  }
  return workerInstance;
}

export function computeAIMoveAsync(
  fen: string,
  difficulty: AIDifficulty,
  signal?: AbortSignal
): Promise<AIMoveResult | null> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(null);
      return;
    }

    const t0 = import.meta.env.DEV ? performance.now() : 0;

    // If an aborted search is still blocking the single worker thread, terminate & respawn cleanly
    if (workerInFlightCount > 0 && pending.size === 0) {
      resetWorker();
    }

    const worker = getWorker();
    const id = nextId++;
    let fallbackTimer = 0;

    const onAbort = () => {
      window.clearTimeout(fallbackTimer);
      pending.delete(id);
      if (worker && workerInFlightCount > 0 && pending.size === 0) {
        resetWorker();
      }
      resolve(null);
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    if (worker) {
      pending.set(id, {
        resolve: (res) => {
          signal?.removeEventListener('abort', onAbort);
          if (import.meta.env.DEV) {
            recordAIMetrics(performance.now() - t0);
          }
          resolve(res);
        },
      });
      workerInFlightCount++;
      worker.postMessage({ id, fen, difficulty });
    } else {
      // Async timeout fallback if Web Workers are blocked in environment
      fallbackTimer = window.setTimeout(() => {
        if (signal?.aborted) return;
        signal?.removeEventListener('abort', onAbort);
        const res = selectAIMoveWithInsight(fen, difficulty);
        if (import.meta.env.DEV) {
          recordAIMetrics(performance.now() - t0);
        }
        resolve(res);
      }, 40);
    }
  });
}
