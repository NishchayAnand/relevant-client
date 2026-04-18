"use client"

import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';

type Cell = 'X' | 'O' | null;

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner(board: Cell[]): { winner: Cell; line: number[] } | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return null;
}

export default function TicTacToeVisualizer() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [isXTurn, setIsXTurn] = useState(true);
  const [xScore, setXScore] = useState(0);
  const [oScore, setOScore] = useState(0);

  const result = checkWinner(board);
  const isDraw = !result && board.every(cell => cell !== null);
  const winLine = result?.line ?? [];

  const handleClick = (idx: number) => {
    if (board[idx] || result || isDraw) return;

    const newBoard = [...board];
    newBoard[idx] = isXTurn ? 'X' : 'O';
    setBoard(newBoard);

    const newResult = checkWinner(newBoard);
    if (newResult) {
      if (newResult.winner === 'X') setXScore(s => s + 1);
      else setOScore(s => s + 1);
    }

    setIsXTurn(!isXTurn);
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setIsXTurn(true);
  };

  const message = result
    ? `Player ${result.winner} wins!`
    : isDraw
    ? "It's a draw!"
    : `Player ${isXTurn ? 'X' : 'O'}'s turn`;

  return (
    <div className="mt-8 mb-10 border rounded-2xl flex items-center justify-center">
      <div className="p-8 w-full">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-6 text-sm">
            <div className="flex flex-col items-center gap-1">
              <span className="font-mono font-bold text-xl text-blue-600">X</span>
              <span className="text-gray-500 text-xs">Player 1</span>
              <span className="font-mono font-bold text-lg">{xScore}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="font-mono font-bold text-xl text-rose-500">O</span>
              <span className="text-gray-500 text-xs">Player 2</span>
              <span className="font-mono font-bold text-lg">{oScore}</span>
            </div>
          </div>

          <button
            onClick={reset}
            className="p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            title="Reset game"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        {/* Status message */}
        <div className="mb-6 text-center text-sm font-medium text-gray-600 h-5">
          {message}
        </div>

        {/* Board */}
        <div className="grid grid-cols-3 gap-2 w-48 mx-auto">
          {board.map((cell, idx) => {
            const isWinCell = winLine.includes(idx);
            return (
              <button
                key={idx}
                onClick={() => handleClick(idx)}
                disabled={!!cell || !!result || isDraw}
                className={`w-14 h-14 flex items-center justify-center text-2xl font-bold rounded-lg border-2 transition-all
                  ${isWinCell
                    ? cell === 'X'
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'bg-rose-500 text-white border-rose-600'
                    : cell === 'X'
                    ? 'bg-blue-50 text-blue-600 border-blue-300'
                    : cell === 'O'
                    ? 'bg-rose-50 text-rose-500 border-rose-300'
                    : 'bg-white text-gray-400 border-gray-300 hover:bg-gray-50 hover:border-gray-400 cursor-pointer'
                  }
                  ${!cell && !result && !isDraw ? 'hover:scale-105' : ''}
                  disabled:cursor-not-allowed
                `}
              >
                {cell ?? ''}
              </button>
            );
          })}
        </div>

        {/* Turn indicator dots */}
        <div className="mt-6 flex justify-center gap-2">
          <div
            className={`w-2 h-2 rounded-full transition-all ${
              !result && !isDraw && isXTurn ? 'bg-blue-500 scale-125' : 'bg-gray-200'
            }`}
          />
          <div
            className={`w-2 h-2 rounded-full transition-all ${
              !result && !isDraw && !isXTurn ? 'bg-rose-500 scale-125' : 'bg-gray-200'
            }`}
          />
        </div>

        {(result || isDraw) && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={reset}
              className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
            >
              Play again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
