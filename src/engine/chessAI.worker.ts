import { selectAIMoveWithInsight, type AIMoveResult } from './chessAI';
import type { AIDifficulty } from '../types/chess';

interface WorkerRequest {
  id: number;
  fen: string;
  difficulty: AIDifficulty;
}

interface WorkerResponse {
  id: number;
  result: AIMoveResult | null;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, fen, difficulty } = e.data;
  const result = selectAIMoveWithInsight(fen, difficulty);
  const response: WorkerResponse = { id, result };
  self.postMessage(response);
};
