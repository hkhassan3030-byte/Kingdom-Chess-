import { Chess, type Move } from 'chess.js';
import type { AIDifficulty, PieceColor, PieceType } from '../types/chess';

export interface AIMoveResult {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  insight: string | null;
}

const PIECE_SCORE: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 335,
  r: 500,
  q: 900,
  k: 20000,
};

const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [55, 55, 55, 55, 55, 55, 55, 55],
  [12, 14, 24, 34, 34, 24, 14, 12],
  [6, 8, 16, 28, 28, 16, 8, 6],
  [2, 2, 8, 24, 24, 8, 2, 2],
  [6, -4, -8, 2, 2, -8, -4, 6],
  [6, 12, 12, -22, -22, 12, 12, 6],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 4, 4, 0, -20, -40],
  [-30, 4, 14, 18, 18, 14, 4, -30],
  [-30, 6, 18, 24, 24, 18, 6, -30],
  [-30, 2, 18, 24, 24, 18, 2, -30],
  [-30, 6, 14, 16, 16, 14, 6, -30],
  [-40, -20, 0, 6, 6, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_PST = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 4, 0, 0, 0, 0, 4, -10],
  [-10, 4, 10, 14, 14, 10, 4, -10],
  [-10, 8, 8, 14, 14, 8, 8, -10],
  [-10, 2, 14, 14, 14, 14, 2, -10],
  [-10, 12, 12, 12, 12, 12, 12, -10],
  [-10, 8, 0, 0, 0, 0, 8, -10],
  [-20, -10, -12, -10, -10, -12, -10, -20],
];

const ROOK_PST = [
  [0, 0, 0, 4, 4, 0, 0, 0],
  [10, 16, 16, 16, 16, 16, 16, 10],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 4, 10, 10, 4, 0, 0],
];

const QUEEN_PST = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 2, 2, 2, 2, 0, -10],
  [-10, 2, 6, 8, 8, 6, 2, -10],
  [-5, 2, 8, 8, 8, 8, 2, -5],
  [0, 2, 8, 8, 8, 8, 2, -5],
  [-10, 6, 8, 8, 8, 8, 2, -10],
  [-10, 0, 6, 2, 2, 2, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_MID_PST = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -24, -24, -20, -20, -10],
  [22, 24, 4, -4, -4, 4, 24, 22],
  [24, 34, 12, -8, 0, 10, 36, 24],
];

const KING_END_PST = [
  [-40, -30, -20, -15, -15, -20, -30, -40],
  [-25, -10, 0, 10, 10, 0, -10, -25],
  [-15, 5, 18, 24, 24, 18, 5, -15],
  [-10, 10, 24, 32, 32, 24, 10, -10],
  [-10, 10, 24, 32, 32, 24, 10, -10],
  [-15, 5, 18, 24, 24, 18, 5, -15],
  [-25, -10, 0, 8, 8, 0, -10, -25],
  [-40, -25, -15, -10, -10, -15, -25, -40],
];

const MATE_SCORE = 100000;
const TT_MAX_SIZE = 55000;

interface TTEntry {
  depth: number;
  score: number;
  flag: 0 | 1 | 2; // 0: EXACT, 1: LOWERBOUND, 2: UPPERBOUND
  bestSan?: string;
}

const KNIGHT_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];

const DIAG_DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

const ORTHO_DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

const ALL_DIRS: ReadonlyArray<readonly [number, number]> = [...DIAG_DIRS, ...ORTHO_DIRS];

function getPstValue(
  type: PieceType,
  color: PieceColor,
  row: number,
  col: number,
  endgameWeight: number
): number {
  const r = color === 'w' ? row : 7 - row;
  switch (type) {
    case 'p':
      return PAWN_PST[r][col];
    case 'n':
      return KNIGHT_PST[r][col];
    case 'b':
      return BISHOP_PST[r][col];
    case 'r':
      return ROOK_PST[r][col];
    case 'q':
      return QUEEN_PST[r][col];
    case 'k':
      return Math.round(
        KING_MID_PST[r][col] * (1 - endgameWeight) + KING_END_PST[r][col] * endgameWeight
      );
  }
}

const _wAttacks = new Uint8Array(64);
const _bAttacks = new Uint8Array(64);
const _wMinAttacker = new Uint16Array(64);
const _bMinAttacker = new Uint16Array(64);
const _wPawnFiles = new Int8Array(8);
const _bPawnFiles = new Int8Array(8);

function getFenKey(chess: Chess): string {
  // Position + side to move + castling + en-passant (ignore halfmove/fullmove for transpositions)
  const fen = chess.fen();
  let spaces = 0;
  for (let i = 0; i < fen.length; i++) {
    if (fen.charCodeAt(i) === 32) {
      spaces++;
      if (spaces === 4) {
        return fen.slice(0, i);
      }
    }
  }
  return fen;
}

function evalKingSafety(
  board: ReturnType<Chess['board']>,
  kr: number,
  kc: number,
  color: PieceColor,
  ownFiles: Int8Array,
  endgameWeight: number
): number {
  if (kr < 0) return 0;
  let kScore = 0;
  const shieldRow = color === 'w' ? kr - 1 : kr + 1;
  for (let dc = -1; dc <= 1; dc++) {
    const fc = kc + dc;
    if (fc < 0 || fc > 7) continue;
    if (ownFiles[fc] === 0) {
      kScore -= 18;
    }
    if (shieldRow >= 0 && shieldRow < 8) {
      const shield = board[shieldRow][fc];
      if (shield && shield.type === 'p' && shield.color === color) {
        kScore += 14;
      }
    }
  }
  if (kc >= 3 && kc <= 4 && ((color === 'w' && kr === 7) || (color === 'b' && kr === 0))) {
    kScore -= 18;
  }
  return Math.round(kScore * (1 - endgameWeight));
}

function evaluatePosition(
  chess: Chess,
  aiColor: PieceColor,
  detailed: boolean,
  skipTerminalChecks: boolean,
  knownInCheck?: boolean
): number {
  if (!skipTerminalChecks) {
    if (chess.isCheckmate()) {
      return chess.turn() === aiColor ? -MATE_SCORE : MATE_SCORE;
    }
    if (chess.isDraw() || chess.isStalemate()) {
      return 0;
    }
  }

  const board = chess.board();

  // First pass: collect piece positions, counts, pawn file distribution, and non-pawn material phase
  let nonPawnMaterial = 0;
  let wBishops = 0;
  let bBishops = 0;
  _wPawnFiles.fill(0);
  _bPawnFiles.fill(0);
  const wPawnFiles = _wPawnFiles;
  const bPawnFiles = _bPawnFiles;
  let wKingR = -1;
  let wKingC = -1;
  let bKingR = -1;
  let bKingC = -1;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      if (cell.type !== 'p' && cell.type !== 'k') {
        nonPawnMaterial += PIECE_SCORE[cell.type];
      }
      if (cell.type === 'b') {
        if (cell.color === 'w') wBishops++;
        else bBishops++;
      } else if (cell.type === 'p') {
        if (cell.color === 'w') wPawnFiles[c]++;
        else bPawnFiles[c]++;
      } else if (cell.type === 'k') {
        if (cell.color === 'w') {
          wKingR = r;
          wKingC = c;
        } else {
          bKingR = r;
          bKingC = c;
        }
      }
    }
  }

  // Phase: 0 in opening/middlegame (~6200+ non-pawn material), 1 in pure endgame
  const endgameWeight = Math.max(0, Math.min(1, 1 - nonPawnMaterial / 5400));

  let score = 0;

  // Bishop pair bonus
  if (wBishops >= 2) score += aiColor === 'w' ? 40 : -40;
  if (bBishops >= 2) score += aiColor === 'b' ? 40 : -40;

  // Attack map + minimum-attacker tracking when detailed evaluation is active
  if (detailed) {
    _wAttacks.fill(0);
    _bAttacks.fill(0);
    _wMinAttacker.fill(0xffff);
    _bMinAttacker.fill(0xffff);
  }
  const wAttacks = detailed ? _wAttacks : null;
  const bAttacks = detailed ? _bAttacks : null;
  const wMinAttacker = detailed ? _wMinAttacker : null;
  const bMinAttacker = detailed ? _bMinAttacker : null;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      const sign = cell.color === aiColor ? 1 : -1;
      const base =
        PIECE_SCORE[cell.type] + getPstValue(cell.type, cell.color, r, c, endgameWeight);
      let bonus = 0;

      // Center control bonus
      if ((r === 3 || r === 4) && (c === 3 || c === 4)) {
        bonus += cell.type === 'p' ? 22 : 16;
      } else if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
        bonus += 6;
      }

      // Pawn structure
      if (cell.type === 'p') {
        const ownFiles = cell.color === 'w' ? wPawnFiles : bPawnFiles;
        const enemyFiles = cell.color === 'w' ? bPawnFiles : wPawnFiles;

        // Doubled pawns
        if (ownFiles[c] > 1) bonus -= 16;

        // Isolated pawns
        const leftEmpty = c === 0 || ownFiles[c - 1] === 0;
        const rightEmpty = c === 7 || ownFiles[c + 1] === 0;
        if (leftEmpty && rightEmpty) bonus -= 15;

        // Connected/supported pawn
        const supportRow = cell.color === 'w' ? r + 1 : r - 1;
        if (supportRow >= 0 && supportRow < 8) {
          if (
            (c > 0 && board[supportRow][c - 1]?.type === 'p' && board[supportRow][c - 1]?.color === cell.color) ||
            (c < 7 && board[supportRow][c + 1]?.type === 'p' && board[supportRow][c + 1]?.color === cell.color)
          ) {
            bonus += 10;
          }
        }

        // Passed pawn check
        let isPassed = enemyFiles[c] === 0;
        if (isPassed) {
          const dir = cell.color === 'w' ? -1 : 1;
          for (let rr = r + dir; rr >= 0 && rr < 8; rr += dir) {
            if (
              (c > 0 && board[rr][c - 1]?.type === 'p' && board[rr][c - 1]?.color !== cell.color) ||
              (c < 7 && board[rr][c + 1]?.type === 'p' && board[rr][c + 1]?.color !== cell.color)
            ) {
              isPassed = false;
              break;
            }
          }
        }
        if (isPassed) {
          const advance = cell.color === 'w' ? 6 - r : r - 1;
          bonus += 18 + advance * advance * 5;
        }
      }

      // Piece activity: Rooks on open / semi-open files & 7th rank
      if (cell.type === 'r') {
        const ownFiles = cell.color === 'w' ? wPawnFiles : bPawnFiles;
        const enemyFiles = cell.color === 'w' ? bPawnFiles : wPawnFiles;
        if (ownFiles[c] === 0 && enemyFiles[c] === 0) bonus += 24;
        else if (ownFiles[c] === 0) bonus += 13;

        if ((cell.color === 'w' && r === 1) || (cell.color === 'b' && r === 6)) {
          bonus += 28;
        }
      }

      // Knight outposts supported by friendly pawn
      if (cell.type === 'n') {
        const inEnemyHalf = cell.color === 'w' ? r <= 3 : r >= 4;
        if (inEnemyHalf && c >= 2 && c <= 5) {
          const supportRow = cell.color === 'w' ? r + 1 : r - 1;
          if (
            supportRow >= 0 &&
            supportRow < 8 &&
            ((c > 0 && board[supportRow][c - 1]?.type === 'p' && board[supportRow][c - 1]?.color === cell.color) ||
              (c < 7 && board[supportRow][c + 1]?.type === 'p' && board[supportRow][c + 1]?.color === cell.color))
          ) {
            bonus += 20;
          }
        }
      }

      // Development discipline & early queen restraint in opening/middlegame
      if (endgameWeight < 0.55) {
        if (
          (cell.type === 'n' || cell.type === 'b') &&
          ((cell.color === 'w' && r === 7) || (cell.color === 'b' && r === 0))
        ) {
          bonus -= 18;
        }
        if (cell.type === 'q' && endgameWeight < 0.25) {
          const homeRow = cell.color === 'w' ? 7 : 0;
          if (r !== homeRow) {
            let undevelopedMinors = 0;
            for (const mc of [1, 2, 5, 6]) {
              const mp = board[homeRow][mc];
              if (mp && mp.color === cell.color && (mp.type === 'n' || mp.type === 'b')) {
                undevelopedMinors++;
              }
            }
            if (undevelopedMinors >= 2) {
              bonus -= undevelopedMinors * 10;
            }
          }
        }
      }

      score += sign * (base + bonus);

      // Detailed attack map, forks, pins & king-zone threat analysis
      if (detailed && wAttacks && bAttacks && wMinAttacker && bMinAttacker) {
        const atkMap = cell.color === 'w' ? wAttacks : bAttacks;
        const minAtkMap = cell.color === 'w' ? wMinAttacker : bMinAttacker;
        const attackerVal = cell.type === 'k' ? 20000 : PIECE_SCORE[cell.type];
        const enemyKR = cell.color === 'w' ? bKingR : wKingR;
        const enemyKC = cell.color === 'w' ? bKingC : wKingC;
        let mobility = 0;
        let highTargetsAttacked = 0;
        let kingZoneHits = 0;

        const recordSquare = (tr: number, tc: number) => {
          const idx = tr * 8 + tc;
          atkMap[idx]++;
          if (attackerVal < minAtkMap[idx]) {
            minAtkMap[idx] = attackerVal;
          }
          mobility++;
          const target = board[tr][tc];
          if (target && target.color !== cell.color) {
            if (
              target.type === 'q' ||
              target.type === 'r' ||
              target.type === 'k' ||
              PIECE_SCORE[target.type] > PIECE_SCORE[cell.type]
            ) {
              highTargetsAttacked++;
            }
          }
          if (
            enemyKR >= 0 &&
            Math.abs(tr - enemyKR) <= 1 &&
            Math.abs(tc - enemyKC) <= 1
          ) {
            kingZoneHits++;
          }
        };

        if (cell.type === 'p') {
          const dr = cell.color === 'w' ? -1 : 1;
          if (r + dr >= 0 && r + dr < 8) {
            if (c > 0) recordSquare(r + dr, c - 1);
            if (c < 7) recordSquare(r + dr, c + 1);
          }
        } else if (cell.type === 'n') {
          for (let k = 0; k < KNIGHT_OFFSETS.length; k++) {
            const tr = r + KNIGHT_OFFSETS[k][0];
            const tc = c + KNIGHT_OFFSETS[k][1];
            if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) recordSquare(tr, tc);
          }
        } else if (cell.type === 'k') {
          for (let k = 0; k < ALL_DIRS.length; k++) {
            const tr = r + ALL_DIRS[k][0];
            const tc = c + ALL_DIRS[k][1];
            if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
              const idx = tr * 8 + tc;
              atkMap[idx]++;
              if (attackerVal < minAtkMap[idx]) {
                minAtkMap[idx] = attackerVal;
              }
            }
          }
        } else {
          const dirs =
            cell.type === 'b' ? DIAG_DIRS : cell.type === 'r' ? ORTHO_DIRS : ALL_DIRS;
          for (let k = 0; k < dirs.length; k++) {
            const dr = dirs[k][0];
            const dc = dirs[k][1];
            let tr = r + dr;
            let tc = c + dc;
            let firstBlockerType: PieceType | null = null;
            while (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
              const occ = board[tr][tc];
              if (!firstBlockerType) {
                recordSquare(tr, tc);
                if (occ) {
                  if (occ.color !== cell.color) {
                    firstBlockerType = occ.type;
                  } else {
                    break;
                  }
                }
              } else {
                // X-ray pin/skewer check behind first enemy piece
                if (occ) {
                  if (
                    occ.color !== cell.color &&
                    (occ.type === 'k' || occ.type === 'q') &&
                    PIECE_SCORE[firstBlockerType] < PIECE_SCORE[occ.type]
                  ) {
                    score += sign * (occ.type === 'k' ? 28 : 16);
                  }
                  break;
                }
              }
              tr += dr;
              tc += dc;
            }
          }
        }

        // Fork / multi-threat bonus
        if (highTargetsAttacked >= 2) {
          score += sign * 34;
        }
        // King zone pressure in middlegame
        if (kingZoneHits > 0 && endgameWeight < 0.75) {
          const weight = cell.type === 'q' ? 14 : cell.type === 'r' ? 10 : 8;
          score += sign * kingZoneHits * weight;
        }
        // Mobility bonus
        score += sign * Math.min(mobility, 12) * (cell.type === 'q' ? 1.5 : 2.5);
      }
    }
  }

  // King safety evaluation (pawn shield + open files near king)
  if (endgameWeight < 0.75) {
    const wSafe = evalKingSafety(board, wKingR, wKingC, 'w', wPawnFiles, endgameWeight);
    const bSafe = evalKingSafety(board, bKingR, bKingC, 'b', bPawnFiles, endgameWeight);
    score += aiColor === 'w' ? wSafe - bSafe : bSafe - wSafe;
  }

  // Undefended / Hanging piece & lesser-attacker threat awareness
  if (detailed && wAttacks && bAttacks && wMinAttacker && bMinAttacker) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = board[r][c];
        if (!cell || cell.type === 'k' || cell.type === 'p') continue;
        const idx = r * 8 + c;
        const enemyAtk = cell.color === 'w' ? bAttacks[idx] : wAttacks[idx];
        const allyDef = cell.color === 'w' ? wAttacks[idx] : bAttacks[idx];
        const minEnemyAttacker = cell.color === 'w' ? bMinAttacker[idx] : wMinAttacker[idx];
        const pieceVal = PIECE_SCORE[cell.type];
        const sign = cell.color === aiColor ? 1 : -1;

        if (enemyAtk > 0 && allyDef === 0) {
          // Completely undefended non-pawn piece: strong penalty (softened if own turn to rescue)
          const factor = cell.color === chess.turn() ? 0.22 : 0.48;
          score -= sign * Math.round(pieceVal * factor);
        } else if (enemyAtk > 0 && minEnemyAttacker < pieceVal) {
          // Attacked by a cheaper piece (e.g. pawn vs knight/bishop/rook/queen) even if defended
          const netLoss = pieceVal - minEnemyAttacker;
          const factor = cell.color === chess.turn() ? 0.2 : 0.45;
          score -= sign * Math.round(netLoss * factor);
        }
      }
    }
  }

  const inCheck = knownInCheck ?? chess.inCheck();
  if (inCheck) {
    score += chess.turn() === aiColor ? -40 : 40;
  }

  return score;
}

export function evaluateBoard(
  chess: Chess,
  aiColor: PieceColor,
  detailed: boolean
): number {
  return evaluatePosition(chess, aiColor, detailed, false, undefined);
}

const _orderScoresScratch = new Int32Array(256);

function getHistoryIndex(from: string, to: string): number {
  const f = ((from.charCodeAt(0) - 97) << 3) | (from.charCodeAt(1) - 49);
  const t = ((to.charCodeAt(0) - 97) << 3) | (to.charCodeAt(1) - 49);
  return (f << 6) | t;
}

function scoreMoveOrder(
  move: Move,
  ttBestSan: string | undefined,
  killer0: string | undefined,
  killer1: string | undefined,
  history: Int32Array
): number {
  if (ttBestSan && move.san === ttBestSan) return 1000000;
  let s = 0;
  if (move.san.includes('#')) return 900000;
  if (move.captured) {
    // MVV-LVA: prioritize capturing high-value pieces with low-value pieces
    s += 100000 + 10 * PIECE_SCORE[move.captured] - PIECE_SCORE[move.piece];
  }
  if (move.promotion) {
    s += 80000 + PIECE_SCORE[move.promotion as PieceType];
  }
  if (killer0 && move.san === killer0) s += 45000;
  else if (killer1 && move.san === killer1) s += 42000;
  if (move.san.includes('+')) s += 30000;
  if (move.flags.includes('k') || move.flags.includes('q')) s += 12000;
  // Center push preference for quiet ordering
  if (move.to === 'd4' || move.to === 'd5' || move.to === 'e4' || move.to === 'e5') {
    s += 1800;
  }
  s += history[getHistoryIndex(move.from, move.to)];
  return s;
}

function getOrderedMoves(
  chess: Chess,
  ttBestSan: string | undefined,
  killer0: string | undefined,
  killer1: string | undefined,
  history: Int32Array
): Move[] {
  const moves = chess.moves({ verbose: true });
  const len = moves.length;
  if (len <= 1) return moves;

  const scores = len <= _orderScoresScratch.length ? _orderScoresScratch : new Int32Array(len);
  for (let i = 0; i < len; i++) {
    scores[i] = scoreMoveOrder(moves[i], ttBestSan, killer0, killer1, history);
  }
  for (let i = 1; i < len; i++) {
    const move = moves[i];
    const score = scores[i];
    let j = i - 1;
    while (j >= 0 && scores[j] < score) {
      moves[j + 1] = moves[j];
      scores[j + 1] = scores[j];
      j--;
    }
    moves[j + 1] = move;
    scores[j + 1] = score;
  }
  return moves;
}

function getQuiescenceMoves(chess: Chess, inCheck: boolean): Move[] {
  const allMoves = chess.moves({ verbose: true });
  const filtered: Move[] = [];
  for (let i = 0; i < allMoves.length; i++) {
    const m = allMoves[i];
    if (inCheck || m.captured || m.promotion === 'q' || m.promotion === 'n') {
      filtered.push(m);
    }
  }
  const len = filtered.length;
  if (len <= 1) return filtered;

  const scores = len <= _orderScoresScratch.length ? _orderScoresScratch : new Int32Array(len);
  for (let i = 0; i < len; i++) {
    const m = filtered[i];
    scores[i] = m.captured ? 10 * PIECE_SCORE[m.captured] - PIECE_SCORE[m.piece] : 0;
  }
  for (let i = 1; i < len; i++) {
    const move = filtered[i];
    const score = scores[i];
    let j = i - 1;
    while (j >= 0 && scores[j] < score) {
      filtered[j + 1] = filtered[j];
      scores[j + 1] = scores[j];
      j--;
    }
    filtered[j + 1] = move;
    scores[j + 1] = score;
  }
  return filtered;
}

interface SearchContext {
  aiColor: PieceColor;
  detailedEval: boolean;
  nodes: number;
  maxNodes: number;
  deadline: number;
  allowAbort: boolean;
  aborted: boolean;
  tt: Map<string, TTEntry>;
  killers: Array<[string | undefined, string | undefined]>;
  history: Int32Array;
}

function toTTScore(score: number, ply: number): number {
  if (score > MATE_SCORE - 500) return score + ply;
  if (score < -MATE_SCORE + 500) return score - ply;
  return score;
}

function fromTTScore(score: number, ply: number): number {
  if (score > MATE_SCORE - 500) return score - ply;
  if (score < -MATE_SCORE + 500) return score + ply;
  return score;
}

function quiescence(
  chess: Chess,
  alpha: number,
  beta: number,
  maximizing: boolean,
  qDepth: number,
  ply: number,
  ctx: SearchContext
): number {
  ctx.nodes++;
  if (ctx.allowAbort && (ctx.nodes & 63) === 0 && performance.now() > ctx.deadline) {
    ctx.aborted = true;
    return evaluatePosition(chess, ctx.aiColor, ctx.detailedEval, false, undefined);
  }

  const inCheck = chess.inCheck();
  if (inCheck) {
    if (chess.isCheckmate()) {
      return chess.turn() === ctx.aiColor ? -MATE_SCORE + ply : MATE_SCORE - ply;
    }
    if (
      chess.isThreefoldRepetition() ||
      chess.isDrawByFiftyMoves() ||
      chess.isInsufficientMaterial()
    ) {
      return 0;
    }
  } else {
    if (
      chess.isThreefoldRepetition() ||
      chess.isDrawByFiftyMoves() ||
      chess.isInsufficientMaterial() ||
      chess.isStalemate()
    ) {
      return 0;
    }
  }

  const standPat = evaluatePosition(chess, ctx.aiColor, ctx.detailedEval, true, inCheck);
  if (qDepth <= 0 || ctx.nodes >= ctx.maxNodes) {
    return standPat;
  }

  if (maximizing) {
    if (!inCheck) {
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;
    }
    const moves = getQuiescenceMoves(chess, inCheck);

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      // Delta pruning for clearly hopeless non-checking captures
      if (
        !inCheck &&
        !move.promotion &&
        !move.san.includes('+') &&
        !move.san.includes('#') &&
        move.captured &&
        standPat + PIECE_SCORE[move.captured] + 180 < alpha
      ) {
        continue;
      }
      chess.move(move);
      const val = quiescence(chess, alpha, beta, false, qDepth - 1, ply + 1, ctx);
      chess.undo();
      if (ctx.aborted) return alpha;
      if (val >= beta) return beta;
      if (val > alpha) alpha = val;
    }
    return alpha;
  } else {
    if (!inCheck) {
      if (standPat <= alpha) return alpha;
      if (standPat < beta) beta = standPat;
    }
    const moves = getQuiescenceMoves(chess, inCheck);

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      if (
        !inCheck &&
        !move.promotion &&
        !move.san.includes('+') &&
        !move.san.includes('#') &&
        move.captured &&
        standPat - PIECE_SCORE[move.captured] - 180 > beta
      ) {
        continue;
      }
      chess.move(move);
      const val = quiescence(chess, alpha, beta, true, qDepth - 1, ply + 1, ctx);
      chess.undo();
      if (ctx.aborted) return beta;
      if (val <= alpha) return alpha;
      if (val < beta) beta = val;
    }
    return beta;
  }
}

function alphabeta(
  chess: Chess,
  depth: number,
  ply: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  qMaxDepth: number,
  useTT: boolean,
  ctx: SearchContext
): number {
  ctx.nodes++;
  if (ctx.allowAbort && (ctx.nodes & 63) === 0 && performance.now() > ctx.deadline) {
    ctx.aborted = true;
    return evaluatePosition(chess, ctx.aiColor, ctx.detailedEval, false, undefined);
  }

  const inCheck = chess.inCheck();
  const isSimpleDraw =
    chess.isThreefoldRepetition() ||
    chess.isDrawByFiftyMoves() ||
    chess.isInsufficientMaterial();

  if (isSimpleDraw) {
    if (inCheck && chess.isCheckmate()) {
      return chess.turn() === ctx.aiColor ? -MATE_SCORE + ply : MATE_SCORE - ply;
    }
    return 0;
  }

  const origAlpha = alpha;
  const origBeta = beta;
  const key = useTT ? getFenKey(chess) : '';
  let ttBestSan: string | undefined;

  if (useTT) {
    const entry = ctx.tt.get(key);
    if (entry) {
      ttBestSan = entry.bestSan;
      if (entry.depth >= depth) {
        const entryScore = fromTTScore(entry.score, ply);
        if (entry.flag === 0) return entryScore;
        if (entry.flag === 1 && entryScore > alpha) alpha = entryScore;
        else if (entry.flag === 2 && entryScore < beta) beta = entryScore;
        if (alpha >= beta) return entryScore;
      }
    }
  }

  if (depth <= 0 || (ctx.allowAbort && ctx.nodes >= ctx.maxNodes)) {
    if (qMaxDepth > 0) {
      return quiescence(chess, alpha, beta, maximizing, qMaxDepth, ply, ctx);
    }
    if (inCheck && chess.isCheckmate()) {
      return chess.turn() === ctx.aiColor ? -MATE_SCORE + ply : MATE_SCORE - ply;
    }
    if (!inCheck && chess.isStalemate()) {
      return 0;
    }
    return evaluatePosition(chess, ctx.aiColor, ctx.detailedEval, true, inCheck);
  }

  const killerPair = ctx.killers[ply] ?? [undefined, undefined];
  const moves = getOrderedMoves(chess, ttBestSan, killerPair[0], killerPair[1], ctx.history);
  if (moves.length === 0) {
    return inCheck
      ? chess.turn() === ctx.aiColor
        ? -MATE_SCORE + ply
        : MATE_SCORE - ply
      : 0;
  }

  let bestMoveSan = moves[0].san;
  let bestVal = maximizing ? -Infinity : Infinity;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    chess.move(move);

    // Subtle check extension in deep modes
    const ext = depth === 1 && ply < 6 && chess.inCheck() ? 1 : 0;

    let val: number;
    if (i === 0 || !useTT) {
      val = alphabeta(
        chess,
        depth - 1 + ext,
        ply + 1,
        alpha,
        beta,
        !maximizing,
        qMaxDepth,
        useTT,
        ctx
      );
    } else {
      // Principal Variation Search (null-window probe)
      if (maximizing) {
        val = alphabeta(
          chess,
          depth - 1 + ext,
          ply + 1,
          alpha,
          alpha + 1,
          false,
          qMaxDepth,
          useTT,
          ctx
        );
        if (!ctx.aborted && val > alpha && val < beta) {
          val = alphabeta(
            chess,
            depth - 1 + ext,
            ply + 1,
            alpha,
            beta,
            false,
            qMaxDepth,
            useTT,
            ctx
          );
        }
      } else {
        val = alphabeta(
          chess,
          depth - 1 + ext,
          ply + 1,
          beta - 1,
          beta,
          true,
          qMaxDepth,
          useTT,
          ctx
        );
        if (!ctx.aborted && val > alpha && val < beta) {
          val = alphabeta(
            chess,
            depth - 1 + ext,
            ply + 1,
            alpha,
            beta,
            true,
            qMaxDepth,
            useTT,
            ctx
          );
        }
      }
    }

    chess.undo();
    if (ctx.aborted) return maximizing ? alpha : beta;

    if (maximizing) {
      if (val > bestVal) {
        bestVal = val;
        bestMoveSan = move.san;
      }
      if (val > alpha) alpha = val;
      if (beta <= alpha) {
        if (!move.captured && ply < ctx.killers.length) {
          if (ctx.killers[ply][0] !== move.san) {
            ctx.killers[ply][1] = ctx.killers[ply][0];
            ctx.killers[ply][0] = move.san;
          }
          ctx.history[getHistoryIndex(move.from, move.to)] += depth * depth * 12;
        }
        break;
      }
    } else {
      if (val < bestVal) {
        bestVal = val;
        bestMoveSan = move.san;
      }
      if (val < beta) beta = val;
      if (beta <= alpha) {
        if (!move.captured && ply < ctx.killers.length) {
          if (ctx.killers[ply][0] !== move.san) {
            ctx.killers[ply][1] = ctx.killers[ply][0];
            ctx.killers[ply][0] = move.san;
          }
          ctx.history[getHistoryIndex(move.from, move.to)] += depth * depth * 12;
        }
        break;
      }
    }
  }

  if (useTT && ctx.tt.size < TT_MAX_SIZE && !ctx.aborted) {
    const flag: 0 | 1 | 2 = bestVal <= origAlpha ? 2 : bestVal >= origBeta ? 1 : 0;
    ctx.tt.set(key, {
      depth,
      score: toTTScore(bestVal, ply),
      flag,
      bestSan: bestMoveSan,
    });
  }

  return bestVal;
}

function buildStatusInsight(
  move: Move,
  score: number,
  difficulty: AIDifficulty
): string | null {
  if (move.san.includes('#')) return 'The final blow is struck.';
  if (move.san.includes('+')) {
    return difficulty === 'grandmaster'
      ? 'Your king is exposed.'
      : 'Guard your king!';
  }
  if (score > 450 && Math.random() < 0.55) {
    return 'A decisive advantage opens.';
  }
  if (move.captured && PIECE_SCORE[move.captured] >= 500 && Math.random() < 0.6) {
    return 'A heavy loss for your ranks.';
  }
  if (move.flags.includes('k') || move.flags.includes('q')) {
    return Math.random() < 0.5 ? 'The monarch takes shelter.' : null;
  }
  if (Math.random() < 0.22) {
    const pool =
      difficulty === 'easy'
        ? ['Let us see how this plays out.', 'Trying a bold advance!']
        : difficulty === 'normal'
        ? ['Holding the line.', 'Interesting move...']
        : difficulty === 'hard'
        ? ['Every square is contested.', 'Testing your defenses.']
        : ['Interesting move...', 'Control the center, command the board.', 'Calculated.'];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return null;
}

export function selectAIMoveWithInsight(
  fen: string,
  difficulty: AIDifficulty
): AIMoveResult | null {
  const chess = new Chess(fen);
  const aiColor = chess.turn() as PieceColor;
  const history = new Int32Array(4096);
  const legalMoves = getOrderedMoves(chess, undefined, undefined, undefined, history);
  if (legalMoves.length === 0) return null;

  // Immediate checkmate in 1 check
  for (const m of legalMoves) {
    if (m.san.includes('#')) {
      return {
        from: m.from,
        to: m.to,
        promotion: m.promotion,
        san: m.san,
        insight: 'Checkmate!',
      };
    }
  }

  // Count non-pawn material to grant extra search depth safely in simplified endgames
  const board = chess.board();
  let nonPawnMaterial = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (cell && cell.type !== 'p' && cell.type !== 'k') {
        nonPawnMaterial += PIECE_SCORE[cell.type];
      }
    }
  }
  const endgameDepthBonus = nonPawnMaterial <= 1800 ? 1 : 0;

  const config: Record<
    AIDifficulty,
    { maxDepth: number; qDepth: number; maxNodes: number; budgetMs: number; detailed: boolean; useTT: boolean }
  > = {
    easy: { maxDepth: 1, qDepth: 1, maxNodes: 650, budgetMs: 70, detailed: false, useTT: false },
    normal: { maxDepth: 2, qDepth: 2, maxNodes: 5500, budgetMs: 220, detailed: true, useTT: true },
    hard: {
      maxDepth: 3 + endgameDepthBonus,
      qDepth: 4,
      maxNodes: 20000,
      budgetMs: 500,
      detailed: true,
      useTT: true,
    },
    expert: {
      maxDepth: 4 + endgameDepthBonus,
      qDepth: 4,
      maxNodes: 45000,
      budgetMs: 850,
      detailed: true,
      useTT: true,
    },
    grandmaster: {
      maxDepth: 5 + endgameDepthBonus,
      qDepth: 5,
      maxNodes: 95000,
      budgetMs: 1350,
      detailed: true,
      useTT: true,
    },
  };

  const cfg = config[difficulty];
  const ctx: SearchContext = {
    aiColor,
    detailedEval: cfg.detailed,
    nodes: 0,
    maxNodes: cfg.maxNodes,
    deadline: performance.now() + cfg.budgetMs,
    allowAbort: false,
    aborted: false,
    tt: new Map<string, TTEntry>(),
    killers: Array.from({ length: 16 }, () => [undefined, undefined]),
    history,
  };

  // Easy mode: fast 1-ply + 1-ply recapture check with beginner-friendly imprecision.
  // Never skips mate-in-1 and filters out mate-in-1 blunders when safe moves exist.
  if (difficulty === 'easy') {
    const scored: Array<{ move: Move; score: number }> = [];
    for (const move of legalMoves) {
      chess.move(move);
      const evalScore = quiescence(chess, -Infinity, Infinity, false, cfg.qDepth, 1, ctx);
      chess.undo();
      const jitter = Math.random() * 90 - 45;
      scored.push({ move, score: evalScore + jitter });
    }
    scored.sort((a, b) => b.score - a.score);

    const safePool = scored.filter((item) => item.score > -MATE_SCORE + 200);
    const activePool = safePool.length > 0 ? safePool : scored;

    const makeInaccuracy = Math.random() < 0.25 && activePool.length > 3;
    const pickIdx = makeInaccuracy
      ? Math.min(
          activePool.length - 1,
          1 + Math.floor(Math.random() * Math.min(4, activePool.length - 1))
        )
      : Math.floor(Math.random() * Math.min(3, activePool.length));

    const chosen = activePool[pickIdx]?.move ?? legalMoves[0];
    return {
      from: chosen.from,
      to: chosen.to,
      promotion: chosen.promotion,
      san: chosen.san,
      insight: buildStatusInsight(chosen, activePool[pickIdx]?.score ?? 0, difficulty),
    };
  }

  let bestMove = legalMoves[0];
  let bestScore = -Infinity;
  let rootMoves = legalMoves;

  // Iterative deepening for Normal -> Grandmaster
  for (let depth = 1; depth <= cfg.maxDepth; depth++) {
    ctx.aborted = false;
    // Always complete depth 1 so slower mobile CPUs never fall back to an unsearched move
    ctx.allowAbort = depth >= 2;

    let iterBestMove = rootMoves[0];
    let iterBestScore = -Infinity;
    const moveScores: Array<{ move: Move; score: number }> = [];
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of rootMoves) {
      // Keep an alpha margin on Normal's final depth so fail-low moves never tie bestScore
      const searchAlpha =
        difficulty === 'normal' && depth === cfg.maxDepth && alpha > -Infinity
          ? alpha - 20
          : alpha;
      chess.move(move);
      const score = alphabeta(
        chess,
        depth - 1,
        1,
        searchAlpha,
        beta,
        false,
        cfg.qDepth,
        cfg.useTT,
        ctx
      );
      chess.undo();

      if (ctx.aborted) break;

      moveScores.push({ move, score });
      if (score > iterBestScore) {
        iterBestScore = score;
        iterBestMove = move;
      }
      if (score > alpha) alpha = score;
    }

    if (!ctx.aborted && moveScores.length === rootMoves.length) {
      bestMove = iterBestMove;
      bestScore = iterBestScore;
      // Order root moves by score from completed depth for next iteration
      moveScores.sort((a, b) => b.score - a.score);
      rootMoves = moveScores.map((ms) => ms.move);

      // Slight variety only between nearly tied moves on Normal
      if (difficulty === 'normal' && depth === cfg.maxDepth && moveScores.length > 1) {
        const tied = moveScores.filter((m) => bestScore - m.score <= 12);
        if (tied.length > 1) {
          bestMove = tied[Math.floor(Math.random() * tied.length)].move;
        }
      }

      if (bestScore >= MATE_SCORE - 20) break;
    } else {
      // If iteration ran out of time after finding a clear improvement on first moves, adopt it
      if (moveScores.length > 0) {
        moveScores.sort((a, b) => b.score - a.score);
        if (moveScores[0].score > bestScore + 50) {
          bestMove = moveScores[0].move;
          bestScore = moveScores[0].score;
        }
      }
      break;
    }

    if (performance.now() > ctx.deadline || ctx.nodes >= ctx.maxNodes) {
      break;
    }
  }

  return {
    from: bestMove.from,
    to: bestMove.to,
    promotion: bestMove.promotion,
    san: bestMove.san,
    insight: buildStatusInsight(bestMove, bestScore, difficulty),
  };
}

export function selectAIMove(fen: string, difficulty: AIDifficulty): Move | null {
  const res = selectAIMoveWithInsight(fen, difficulty);
  if (!res) return null;
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  return (
    moves.find(
      (m) =>
        m.from === res.from &&
        m.to === res.to &&
        (m.promotion ?? undefined) === (res.promotion ?? undefined)
    ) ?? null
  );
}
