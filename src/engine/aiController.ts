import { selectAIMoveWithInsight, type AIMoveResult } from './chessAI';
import { recordAIMetrics } from '../utils/devPerfMonitor';
import type { AIDifficulty } from '../types/chess';

interface PendingTask {
  resolve: (result: AIMoveResult | null) => void;
}

let workerInstance: Worker | null = null;
let workerFailed = false;
let nextId = 1;
const pending = new Map<number, PendingTask>();

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
        const task = pending.get(e.data.id);
        if (task) {
          pending.delete(e.data.id);
          task.resolve(e.data.result);
        }
      };
      workerInstance.onerror = () => {
        workerFailed = true;
        workerInstance?.terminate();
        workerInstance = null;
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
    const worker = getWorker();
    const id = nextId++;

    const onAbort = () => {
      pending.delete(id);
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
      worker.postMessage({ id, fen, difficulty });
    } else {
      // Async timeout fallback if Web Workers are blocked in environment
      window.setTimeout(() => {
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
