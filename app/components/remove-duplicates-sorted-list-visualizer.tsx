'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Node = {
  val: number;
  index: number;
};

export function RemoveDuplicatesSortedListVisualizer() {
  const defaultList = [1, 2, 2, 3, 3, 3, 4];
  
  const [originalList] = useState<number[]>(defaultList);
  const [nodes, setNodes] = useState<Node[]>(defaultList.map((val, index) => ({ val, index })));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [duplicateFound, setDuplicateFound] = useState(false);
  const [showPointerUpdate, setShowPointerUpdate] = useState(false);

  useEffect(() => {
    if (!isPlaying || currentIndex >= nodes.length) {
      if (currentIndex >= nodes.length && nodes.length < originalList.length) {
        setIsPlaying(false);
        setIsComplete(true);
      }
      return;
    }

    const timer = setTimeout(() => {
      executeStep();
    }, 1000);

    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, nodes, originalList.length]);

  const executeStep = () => {
    if (currentIndex >= nodes.length - 1) {
      setMessage('✓ Complete!');
      setIsPlaying(false);
      setIsComplete(true);
      return;
    }

    // After showing pointer update, clear flags and continue
    if (showPointerUpdate && !duplicateFound) {
      setShowPointerUpdate(false);
      return;
    }

    const current = nodes[currentIndex];
    const next = nodes[currentIndex + 1];

    if (current.val === next.val) {
      if (!showPointerUpdate) {
        // Phase 1: Highlight duplicate
        setMessage(`Duplicate found: ${current.val} ✕ Skip`);
        setDuplicateFound(true);
        setShowPointerUpdate(true);
      } else {
        // Phase 2: Remove duplicate node and show pointer update
        const newNodes = nodes.filter((_, idx) => idx !== currentIndex + 1);
        setNodes(newNodes);
        const nextValue = newNodes[currentIndex + 1]?.val || 'null';
        setMessage(`Pointer updated: ${current.val} → ${nextValue}`);
        setDuplicateFound(false);
        // Keep showPointerUpdate true so next step clears it
      }
    } else {
      setMessage(`Move to next: ${next.val}`);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleStep = () => {
    if (!isPlaying && currentIndex < nodes.length) {
      executeStep();
    }
  };

  const reset = () => {
    setNodes(defaultList.map((val, index) => ({ val, index })));
    setCurrentIndex(0);
    setIsPlaying(false);
    setMessage('');
    setIsComplete(false);
    setDuplicateFound(false);
    setShowPointerUpdate(false);
  };

  return (
    <div className="mt-8 mb-10 border rounded-lg overflow-hidden">
      <div className="p-6">
        {/* Controls */}
        <div className="mb-6 flex gap-2 items-center">
          <Button
            onClick={() => setIsPlaying(!isPlaying)}
            variant="default"
            size="sm"
            disabled={isComplete}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-1" /> Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" /> Play
              </>
            )}
          </Button>
          <Button
            onClick={handleStep}
            variant="outline"
            size="sm"
            disabled={isPlaying || isComplete}
          >
            <SkipForward className="w-4 h-4 mr-1" /> Step
          </Button>
          <Button onClick={reset} variant="outline" size="icon">
            <RotateCcw className="w-4 h-4" />
          </Button>
          {message && <span className="text-sm text-slate-700 self-center ml-2">{message}</span>}
        </div>

        {/* Linked List Visualization */}
        <div className="mb-4 overflow-x-auto">
          <div className="flex gap-2 justify-start items-center py-3 px-2 min-w-fit">
            {nodes.map((node, idx) => {
              const isCurrent = idx === currentIndex;
              const isNext = idx === currentIndex + 1;
              const isDuplicate = duplicateFound && (isCurrent || isNext);
              const isPointerTarget = showPointerUpdate && isCurrent;

              return (
                <div key={node.index} className="flex items-center gap-2">
                  <div
                    className={`
                      w-12 h-12 rounded flex items-center justify-center font-semibold transition-all
                      ${isDuplicate ? 'bg-yellow-400 text-slate-900 ring-4 ring-yellow-300 animate-pulse' : ''}
                      ${isPointerTarget ? 'bg-green-500 text-white ring-4 ring-green-300' : ''}
                      ${isCurrent && !isDuplicate && !isPointerTarget ? 'bg-blue-500 text-white ring-2 ring-blue-300' : ''}
                      ${isNext && !isComplete && !isDuplicate ? 'bg-red-500 text-white ring-2 ring-red-300' : ''}
                      ${!isCurrent && !isNext && !isDuplicate ? 'bg-slate-300 text-slate-800' : ''}
                    `}
                  >
                    {node.val}
                  </div>
                  {idx < nodes.length - 1 && (
                    <div className={`text-lg ${showPointerUpdate && isCurrent ? 'text-green-500 font-bold' : 'text-slate-500'}`}>
                      →
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Result Summary */}
        <div className="text-xs text-slate-600">
          {isComplete && (
            <span className="text-green-700 font-medium">
              ✓ Done: {originalList.length} nodes → {nodes.length} nodes
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
