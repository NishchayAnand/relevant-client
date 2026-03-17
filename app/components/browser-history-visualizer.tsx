'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type OperationType = 'visit' | 'back' | 'forward';

export default function BrowserHistoryVisualizer() {
  const defaultHomePage = 'leetcode.com';

  const [isInitialized, setIsInitialized] = useState(false);
  const [homePage, setHomePage] = useState(defaultHomePage);
  const [homePageInput, setHomePageInput] = useState(defaultHomePage);
  const [history, setHistory] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOperation, setSelectedOperation] = useState<OperationType>('visit');
  const [urlInput, setUrlInput] = useState('google.com');
  const [stepsInput, setStepsInput] = useState('1');
  const [currentOperation, setCurrentOperation] = useState('Not initialized yet');
  const [operationLog, setOperationLog] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);

  const parseSteps = () => {
    const parsed = Number.parseInt(stepsInput, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      return 1;
    }
    return parsed;
  };

  const initializeHistory = () => {
    const nextHomePage = homePageInput.trim() || defaultHomePage;
    const initOperation = `BrowserHistory("${nextHomePage}")`;

    setIsInitialized(true);
    setHomePage(nextHomePage);
    setHistory([nextHomePage]);
    setCurrentIndex(0);
    setCurrentOperation(initOperation);
    setOperationLog([initOperation]);
    setResult(null);
  };

  const resetSimulation = () => {
    if (!isInitialized) return;

    const initOperation = `BrowserHistory("${homePage}")`;
    setHistory([homePage]);
    setCurrentIndex(0);
    setCurrentOperation(initOperation);
    setOperationLog([initOperation]);
    setResult(null);
  };

  const applyOperation = () => {
    if (!isInitialized || history.length === 0) return;

    if (selectedOperation === 'visit') {
      const nextUrl = urlInput.trim();
      if (!nextUrl) return;

      const nextHistory = history.slice(0, currentIndex + 1);
      nextHistory.push(nextUrl);

      const operation = `visit("${nextUrl}")`;
      setHistory(nextHistory);
      setCurrentIndex(nextHistory.length - 1);
      setCurrentOperation(operation);
      setOperationLog((prev) => [...prev, operation]);
      setResult(null);
      return;
    }

    const steps = parseSteps();
    const nextIndex =
      selectedOperation === 'back'
        ? Math.max(0, currentIndex - steps)
        : Math.min(history.length - 1, currentIndex + steps);

    const operation = `${selectedOperation}(${steps})`;
    const nextResult = history[nextIndex];

    setCurrentIndex(nextIndex);
    setCurrentOperation(operation);
    setOperationLog((prev) => [...prev, operation]);
    setResult(nextResult);
  };

  return (
    <div className="mt-8 mb-10 border rounded-2xl overflow-hidden">
      <div className="p-8">
        <div className="mb-4 flex justify-end">
          <Button
            onClick={resetSimulation}
            variant="outline"
            size="icon"
            disabled={!isInitialized}
            className="border-gray-300 text-gray-700"
          >
            <RotateCcw size={18} />
          </Button>
        </div>

        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-3">Input</div>
          <div className="text-xs text-gray-500 mb-3">Choose an operation, provide values, and apply it to update browser history.</div>
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="min-w-45 flex-1">
              <div className="mb-1.5 text-xs font-medium text-gray-600">Home page</div>
              <input
                type="text"
                value={homePageInput}
                onChange={(e) => setHomePageInput(e.target.value)}
                placeholder="e.g. leetcode.com"
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition focus-visible:border-gray-500 focus-visible:ring-2 focus-visible:ring-gray-300"
              />
            </div>
            <Button
              onClick={initializeHistory}
              className="h-10"
            >
              Initialize
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div>
              <div className="mb-1.5 text-xs font-medium text-gray-600">Operation</div>
              <select
                value={selectedOperation}
                onChange={(e) => setSelectedOperation(e.target.value as OperationType)}
                className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition focus-visible:border-gray-500 focus-visible:ring-2 focus-visible:ring-gray-300"
              >
                <option value="visit">visit(url)</option>
                <option value="back">back(steps)</option>
                <option value="forward">forward(steps)</option>
              </select>
            </div>

            {selectedOperation === 'visit' ? (
              <div className="min-w-45 flex-1">
                <div className="mb-1.5 text-xs font-medium text-gray-600">URL</div>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="e.g. google.com"
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition focus-visible:border-gray-500 focus-visible:ring-2 focus-visible:ring-gray-300"
                />
              </div>
            ) : (
              <div>
                <div className="mb-1.5 text-xs font-medium text-gray-600">Steps</div>
                <input
                  type="number"
                  min={1}
                  value={stepsInput}
                  onChange={(e) => setStepsInput(e.target.value)}
                  className="h-10 w-28 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition focus-visible:border-gray-500 focus-visible:ring-2 focus-visible:ring-gray-300"
                />
              </div>
            )}

            <Button
              onClick={applyOperation}
              className="h-10"
            >
              Apply
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-3">Input Sequence</div>
          <div className="flex flex-wrap gap-2">
            {operationLog.map((operation, idx) => (
              <div
                key={idx}
                className="px-3 py-2 rounded border border-gray-200 bg-gray-50 text-xs font-mono text-gray-700 break-all"
              >
                {idx + 1}. {operation}
              </div>
            ))}
          </div>
        </div>

        {/* <div className="mb-3 text-xs text-gray-600">
          Step <span className="font-mono font-bold text-gray-800">{operationLog.length}</span>
        </div> */}

        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-3">Operation</div>
          <div className="text-sm font-mono text-gray-800 bg-gray-50 p-3 rounded border border-gray-200 break-all">
            {currentOperation}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold text-gray-700 mb-3">History</div>
          <div className="flex flex-wrap gap-2">
            {history.map((url, idx) => (
              <div
                key={idx}
                className={`px-3 py-2 rounded border text-sm font-mono break-all ${
                  idx === currentIndex
                    ? 'bg-blue-500 text-white border-blue-600 font-bold'
                    : idx < currentIndex
                    ? 'bg-gray-100 text-gray-700 border-gray-300'
                    : 'bg-white text-gray-400 border-gray-300'
                }`}
              >
                {url}
              </div>
            ))}
          </div>
        </div>

        {result && (
          <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded text-sm">
            <span className="text-gray-600">Returns: </span>
            <span className="font-mono font-bold text-green-700">"{result}"</span>
          </div>
        )}
      </div>
    </div>
  );
}
