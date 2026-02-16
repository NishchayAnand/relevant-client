"use client"

import React, { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';

export default function BestTimeStockGreedyVisualizer() {
  const initialPrices = [7, 1, 5, 3, 6, 4];

  const [prices] = useState(initialPrices);
  const [day, setDay] = useState(1);
  const [minBuyDay, setMinBuyDay] = useState(0);
  const [bestBuyDay, setBestBuyDay] = useState(0);
  const [bestSellDay, setBestSellDay] = useState(0);
  const [maxProfit, setMaxProfit] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState('Click Play or Step to begin');

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(() => {
      executeStep();
    }, 900);

    return () => clearTimeout(timer);
  }, [isPlaying, day, minBuyDay, maxProfit]);

  const executeStep = () => {
    if (day >= prices.length) {
      setMessage(
        `Complete! Buy on day ${bestBuyDay + 1} at ${prices[bestBuyDay]}, sell on day ${bestSellDay + 1} at ${prices[bestSellDay]}, profit = ${maxProfit}`
      );
      setIsPlaying(false);
      return;
    }

    const currentPrice = prices[day];
    const minPrice = prices[minBuyDay];

    if (currentPrice < minPrice) {
      setMinBuyDay(day);
      setMessage(
        `Day ${day + 1}: price ${currentPrice} is a new minimum, update buy day`
      );
      setDay(day + 1);
      return;
    }

    const currentProfit = currentPrice - minPrice;

    if (currentProfit > maxProfit) {
      setMaxProfit(currentProfit);
      setBestBuyDay(minBuyDay);
      setBestSellDay(day);
      setMessage(
        `Day ${day + 1}: profit ${currentProfit} beats maxProfit, update best transaction`
      );
    } else {
      setMessage(
        `Day ${day + 1}: profit ${currentProfit} does not beat maxProfit ${maxProfit}`
      );
    }

    setDay(day + 1);
  };

  const reset = () => {
    setDay(1);
    setMinBuyDay(0);
    setBestBuyDay(0);
    setBestSellDay(0);
    setMaxProfit(0);
    setIsPlaying(false);
    setMessage('Click Play or Step to begin');
  };

  const togglePlay = () => {
    if (day >= prices.length) {
      reset();
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  return (
    <div className="mt-8 mb-10 border rounded-2xl flex items-center justify-center">
      <div className="p-8 w-full">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-6 text-sm flex-wrap">
            <div>
              <span className="text-gray-500">current day = </span>
              <span className="font-mono font-bold text-lg text-blue-600">
                {Math.min(day + 1, prices.length)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">min buy = </span>
              <span className="font-mono font-bold text-lg text-green-600">
                day {minBuyDay + 1} ({prices[minBuyDay]})
              </span>
            </div>
            <div>
              <span className="text-gray-500">max profit = </span>
              <span className="font-mono font-bold text-lg text-purple-600">
                {maxProfit}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={togglePlay}
              className="p-2 bg-gray-800 text-white rounded hover:bg-gray-700"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              onClick={executeStep}
              disabled={isPlaying || day >= prices.length}
              className="p-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <SkipForward size={18} />
            </button>
            <button
              onClick={reset}
              className="p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        <div className="my-10 text-center text-sm text-gray-600 font-medium min-h-5">
          {message}
        </div>

        <div className="grid grid-cols-6 gap-3 items-end">
          {prices.map((price, idx) => {
            const isCurrent = idx === day && day < prices.length;
            const isMinBuy = idx === minBuyDay;
            const isBestBuy = idx === bestBuyDay && maxProfit > 0;
            const isBestSell = idx === bestSellDay && maxProfit > 0;

            let barClass = 'bg-gray-200 border-gray-300';
            if (isBestBuy || isBestSell) {
              barClass = 'bg-purple-100 border-purple-400';
            }
            if (isMinBuy) {
              barClass = 'bg-green-100 border-green-400';
            }
            if (isCurrent) {
              barClass = 'bg-blue-100 border-blue-400';
            }

            return (
              <div key={idx} className="flex flex-col items-center relative">
                {(isCurrent || isMinBuy || isBestBuy || isBestSell) && (
                  <div className="absolute -top-8 text-[11px] font-semibold text-center leading-tight">
                    {isCurrent && <div className="text-blue-600">current</div>}
                    {isMinBuy && <div className="text-green-600">min</div>}
                    {isBestBuy && <div className="text-purple-600">best buy</div>}
                    {isBestSell && <div className="text-purple-600">best sell</div>}
                  </div>
                )}

                <div
                  className={`w-full max-w-14 rounded-t border-2 transition-all ${barClass}`}
                  style={{ height: `${price * 14}px` }}
                />
                <div className="mt-2 text-xs text-gray-500">day {idx + 1}</div>
                <div className="font-mono text-sm font-semibold">{price}</div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Greedy idea: keep the lowest buy price seen so far, and at each day compute possible profit by selling today.
        </p>
      </div>
    </div>
  );
}
