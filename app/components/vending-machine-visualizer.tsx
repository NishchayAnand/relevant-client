'use client';

import { useState } from 'react';

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  swatch: string;
};

const STARTING_STOCK: Product[] = [
  { id: 'water', name: 'Water', price: 20, stock: 4, swatch: 'bg-sky-300' },
  { id: 'soda', name: 'Soda', price: 35, stock: 3, swatch: 'bg-violet-400' },
  { id: 'chips', name: 'Chips', price: 25, stock: 2, swatch: 'bg-amber-300' },
  { id: 'chocolate', name: 'Chocolate', price: 15, stock: 5, swatch: 'bg-rose-400' },
  { id: 'juice', name: 'Juice', price: 30, stock: 1, swatch: 'bg-orange-300' },
  { id: 'cookies', name: 'Cookies', price: 40, stock: 0, swatch: 'bg-yellow-300' },
];

const NOTES = [1, 2, 5, 10, 20, 50];

function changeFor(amount: number) {
  const coins: number[] = [];
  for (const note of [50, 20, 10, 5, 2, 1]) {
    while (amount >= note) {
      coins.push(note);
      amount -= note;
    }
  }
  return coins;
}

function formatChange(coins: number[]) {
  if (coins.length === 0) return 'No change';
  return coins.map((coin) => `₹${coin}`).join(' + ');
}

export function VendingMachineVisualizer() {
  const [products, setProducts] = useState(STARTING_STOCK);
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(STARTING_STOCK.map((product) => [product.id, product.stock > 0 ? 1 : 0])),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inserted, setInserted] = useState(0);
  const [message, setMessage] = useState('Select a product');
  const [tray, setTray] = useState<{ item: string | null; change: number[] } | null>(null);

  const selected = products.find((product) => product.id === selectedId) ?? null;
  const paying = selected !== null && tray === null;

  function quantityOf(product: Product) {
    if (product.stock === 0) return 0;
    const stored = quantities[product.id] ?? 1;
    return Math.min(product.stock, Math.max(1, stored));
  }

  const quantity = selected ? quantityOf(selected) : 0;
  const total = selected ? selected.price * quantity : 0;

  function vend(product: Product, count: number, paid: number) {
    const due = product.price * count;
    const left = product.stock - count;
    setProducts((current) =>
      current.map((item) => (item.id === product.id ? { ...item, stock: left } : item)),
    );
    setQuantities((current) => ({
      ...current,
      [product.id]: left > 0 ? Math.min(current[product.id] ?? 1, left) : 0,
    }));
    setInserted(paid);
    setTray({ item: `${product.name} ×${count}`, change: changeFor(paid - due) });
    setMessage('Please collect your item and change');
  }

  function selectProduct(product: Product) {
    if (tray) {
      setMessage('Please collect your item and change');
      return;
    }
    if (product.stock === 0) {
      setSelectedId(null);
      setInserted(0);
      setMessage('Out of stock');
      return;
    }
    if (inserted > 0 && selectedId && selectedId !== product.id) {
      setMessage('Cancel to choose a different product');
      return;
    }
    setSelectedId(product.id);
    if (selectedId !== product.id) setInserted(0);
    setMessage('Insert money to proceed');
  }

  function changeQuantity(product: Product, next: number) {
    if (tray) {
      setMessage('Please collect your item and change');
      return;
    }
    if (product.stock === 0) return;
    if (inserted > 0 && selectedId && selectedId !== product.id) {
      setMessage('Cancel to choose a different product');
      return;
    }
    const count = Math.min(product.stock, Math.max(1, next));
    setQuantities((current) => ({ ...current, [product.id]: count }));
    setSelectedId(product.id);
    const due = product.price * count;
    if (inserted === 0) {
      setMessage('Insert money to proceed');
      return;
    }
    if (inserted < due) {
      setMessage(`Insert ₹${due - inserted} more`);
      return;
    }
    vend(product, count, inserted);
  }

  function insert(note: number) {
    if (!selected || tray) return;
    const next = inserted + note;
    if (next < total) {
      setInserted(next);
      setMessage(`Insert ₹${total - next} more`);
      return;
    }
    vend(selected, quantity, next);
  }

  function cancel() {
    if (!paying) return;
    if (inserted === 0) {
      setSelectedId(null);
      setMessage('Select a product');
      return;
    }
    setTray({ item: null, change: changeFor(inserted) });
    setMessage('Payment returned');
  }

  function collect() {
    setTray(null);
    setSelectedId(null);
    setInserted(0);
    setMessage('Select a product');
  }

  function restock() {
    setProducts(STARTING_STOCK);
    setQuantities(
      Object.fromEntries(STARTING_STOCK.map((product) => [product.id, product.stock > 0 ? 1 : 0])),
    );
    setSelectedId(null);
    setInserted(0);
    setTray(null);
    setMessage('Select a product');
  }

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="grid gap-3 p-3 md:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)]">
        <div className="rounded-lg border border-neutral-300 bg-neutral-200/80 p-3 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Products
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {products.map((product) => {
              const active = product.id === selectedId;
              const empty = product.stock === 0;
              const count = quantityOf(product);
              return (
                <div
                  key={product.id}
                  className={`rounded-md border bg-white px-2 py-2 dark:bg-neutral-950 ${
                    active
                      ? 'border-emerald-500 ring-2 ring-emerald-200'
                      : 'border-neutral-200 dark:border-neutral-800'
                  } ${empty ? 'opacity-60' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => selectProduct(product)}
                    aria-pressed={active}
                    className="w-full text-left"
                  >
                    <span className={`mb-2 block h-8 w-8 rounded-md ${product.swatch} ${empty ? 'grayscale' : ''}`} />
                    <span className="block text-[13px] font-medium text-neutral-800 dark:text-neutral-100">
                      {product.name}
                    </span>
                    <span className="mt-0.5 flex items-center justify-between text-[12px] text-neutral-500">
                      <span>₹{product.price}</span>
                      <span>{empty ? 'Sold out' : `×${product.stock}`}</span>
                    </span>
                  </button>
                  <span className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-neutral-400">Qty</span>
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Decrease ${product.name} quantity`}
                        disabled={empty || !!tray || count <= 1}
                        onClick={() => changeQuantity(product, count - 1)}
                        className="h-6 w-6 rounded border border-neutral-200 text-[14px] leading-none text-neutral-700 disabled:cursor-not-allowed disabled:text-neutral-300 dark:border-neutral-700"
                      >
                        −
                      </button>
                      <span className="w-4 text-center font-mono text-[13px] text-neutral-800 dark:text-neutral-100">
                        {count}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase ${product.name} quantity`}
                        disabled={empty || !!tray || count >= product.stock}
                        onClick={() => changeQuantity(product, count + 1)}
                        className="h-6 w-6 rounded border border-neutral-200 text-[14px] leading-none text-neutral-700 disabled:cursor-not-allowed disabled:text-neutral-300 dark:border-neutral-700"
                      >
                        +
                      </button>
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3 text-white">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Screen</div>
            <div className="mt-1 min-h-10 text-sm leading-snug text-emerald-300">{message}</div>
            {paying && selected ? (
              <div className="mt-2 flex justify-between gap-2 font-mono text-[12px] text-neutral-300">
                <span>
                  ₹{selected.price} × {quantity} = ₹{total}
                </span>
                <span>Paid ₹{inserted}</span>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {NOTES.map((note) => (
              <button
                key={note}
                type="button"
                disabled={!paying}
                onClick={() => insert(note)}
                className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[12px] font-medium text-neutral-700 hover:border-neutral-300 disabled:cursor-not-allowed disabled:text-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                ₹{note}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={cancel}
            disabled={!paying}
            className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[12px] font-medium text-neutral-600 hover:border-neutral-300 disabled:cursor-not-allowed disabled:text-neutral-300 dark:border-neutral-700 dark:bg-neutral-900"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="mx-3 mb-3 flex min-h-16 items-center justify-between gap-3 rounded-lg border border-dashed border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Tray</div>
          {tray ? (
            <div className="mt-1 text-[13px] text-neutral-700 dark:text-neutral-200">
              {tray.item ? <span className="font-medium">{tray.item}</span> : null}
              {tray.item ? <span className="text-neutral-400"> · </span> : null}
              <span>{formatChange(tray.change)}</span>
            </div>
          ) : (
            <div className="mt-1 text-[13px] text-neutral-400">Empty</div>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={collect}
            disabled={!tray}
            className="rounded-md bg-neutral-900 px-2.5 py-1 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
          >
            Collect
          </button>
          <button
            type="button"
            onClick={restock}
            className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-[12px] font-medium text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-950"
          >
            Restock
          </button>
        </div>
      </div>
    </div>
  );
}
