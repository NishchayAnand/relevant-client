'use client';

import { useEffect, useRef, useState } from 'react';

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
const STEP_MS = 1800;
const STEPS = ['Validate', 'Dispense', 'Update'] as const;

type Phase = 'idle' | 'validate' | 'dispense' | 'update' | 'ready';

function phaseIndex(phase: Phase) {
  if (phase === 'validate') return 0;
  if (phase === 'dispense') return 1;
  if (phase === 'update') return 2;
  if (phase === 'ready') return 3;
  return -1;
}

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

function TraySlot({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col justify-center rounded-md bg-neutral-900 px-2.5 py-2">
      <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{label}</span>
      {children}
    </div>
  );
}

function TrayEmpty({ label = 'Empty' }: { label?: string }) {
  return <span className="text-[12px] text-neutral-500">{label}</span>;
}

type TrayItem = {
  name: string;
  count: number;
  swatch: string;
};

type OrderLine = {
  product: Product;
  count: number;
};

function emptyQuantities() {
  return Object.fromEntries(STARTING_STOCK.map((product) => [product.id, 0]));
}

function linesFrom(catalog: Product[], qty: Record<string, number>): OrderLine[] {
  return catalog
    .map((product) => ({
      product,
      count:
        product.stock === 0 ? 0 : Math.min(product.stock, Math.max(0, qty[product.id] ?? 0)),
    }))
    .filter((line) => line.count > 0);
}

function dueFor(lines: OrderLine[]) {
  return lines.reduce((sum, line) => sum + line.product.price * line.count, 0);
}

export function VendingMachineVisualizer() {
  const [products, setProducts] = useState(STARTING_STOCK);
  const [quantities, setQuantities] = useState<Record<string, number>>(emptyQuantities);
  const [inserted, setInserted] = useState(0);
  const [message, setMessage] = useState('Select a product');
  const [tray, setTray] = useState<{ items: TrayItem[]; change: number[] } | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [receipt, setReceipt] = useState<OrderLine[] | null>(null);
  const [updatedIds, setUpdatedIds] = useState<string[]>([]);
  const timers = useRef<number[]>([]);

  function clearTimers() {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }

  useEffect(() => clearTimers, []);

  function quantityOf(product: Product) {
    if (product.stock === 0) return 0;
    const stored = quantities[product.id] ?? 0;
    return Math.min(product.stock, Math.max(0, stored));
  }

  const order = linesFrom(products, quantities);
  const total = dueFor(order);
  const busy = phase !== 'idle';
  const paying = order.length > 0 && !busy && tray === null;
  const displayLines = receipt ?? order;
  const displayTotal = dueFor(displayLines);

  function vend(lines: OrderLine[], paid: number) {
    const due = dueFor(lines);
    const change = changeFor(paid - due);
    const items = lines.map((line) => ({
      name: line.product.name,
      count: line.count,
      swatch: line.product.swatch,
    }));
    const counts = new Map(lines.map((line) => [line.product.id, line.count]));
    clearTimers();
    setReceipt(lines);
    setInserted(paid);
    setPhase('validate');
    setMessage(paid === due ? `Validating payment: ₹${paid} matches ₹${due}` : `Validating payment: ₹${paid} covers ₹${due}`);

    timers.current.push(
      window.setTimeout(() => {
        setPhase('dispense');
        setTray({ items, change });
        setMessage('Dispensing items and change');
      }, STEP_MS),
    );
    timers.current.push(
      window.setTimeout(() => {
        setPhase('update');
        setProducts((current) =>
          current.map((item) =>
            counts.has(item.id) ? { ...item, stock: item.stock - (counts.get(item.id) ?? 0) } : item,
          ),
        );
        setQuantities(emptyQuantities());
        setUpdatedIds([...counts.keys()]);
        setMessage('Updating inventory');
      }, STEP_MS * 2),
    );
    timers.current.push(
      window.setTimeout(() => {
        setPhase('ready');
        setMessage('Please collect your item and change');
      }, STEP_MS * 3),
    );
  }

  function applyOrder(nextQuantities: Record<string, number>) {
    const lines = linesFrom(products, nextQuantities);
    const due = dueFor(lines);
    if (due === 0 || inserted < due) {
      setQuantities(nextQuantities);
      if (due === 0) setMessage(inserted > 0 ? 'Cancel to return payment' : 'Select a product');
      else if (inserted === 0) setMessage('Insert money to proceed');
      else setMessage(`Insert ₹${due - inserted} more`);
      return;
    }
    vend(lines, inserted);
  }

  function selectProduct(product: Product) {
    if (busy) return;
    if (tray) {
      setMessage('Please collect your item and change');
      return;
    }
    if (product.stock === 0) {
      setMessage('Out of stock');
      return;
    }
    if (quantityOf(product) > 0) return;
    applyOrder({ ...quantities, [product.id]: 1 });
  }

  function changeQuantity(product: Product, next: number) {
    if (busy) return;
    if (tray) {
      setMessage('Please collect your item and change');
      return;
    }
    if (product.stock === 0) return;
    const count = Math.min(product.stock, Math.max(0, next));
    applyOrder({ ...quantities, [product.id]: count });
  }

  function insert(note: number) {
    if (busy || tray || total === 0) return;
    const next = inserted + note;
    if (next < total) {
      setInserted(next);
      setMessage(`Insert ₹${total - next} more`);
      return;
    }
    vend(order, next);
  }

  function cancel() {
    if (busy || tray) return;
    if (inserted === 0) {
      if (order.length === 0) return;
      setQuantities(emptyQuantities());
      setMessage('Select a product');
      return;
    }
    setTray({ items: [], change: changeFor(inserted) });
    setMessage('Payment returned');
  }

  function collect() {
    clearTimers();
    setPhase('idle');
    setReceipt(null);
    setUpdatedIds([]);
    setTray(null);
    setQuantities(emptyQuantities());
    setInserted(0);
    setMessage('Select a product');
  }

  function restock() {
    clearTimers();
    setPhase('idle');
    setReceipt(null);
    setUpdatedIds([]);
    setProducts(STARTING_STOCK);
    setQuantities(emptyQuantities());
    setInserted(0);
    setTray(null);
    setMessage('Select a product');
  }

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-100">
      <div className="grid gap-3 p-3 md:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)]">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Products
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {products.map((product) => {
              const count = quantityOf(product);
              const active = count > 0;
              const empty = product.stock === 0;
              const updated = updatedIds.includes(product.id);
              return (
                <div
                  key={product.id}
                  className={`rounded-md border bg-neutral-950 px-2 py-2 ${
                    updated
                      ? 'border-amber-400 ring-2 ring-amber-400/40'
                      : active
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'border-neutral-800'
                  } ${empty && !updated ? 'opacity-60' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => selectProduct(product)}
                    aria-pressed={active}
                    className="w-full text-left"
                  >
                    <span className={`mb-2 block h-8 w-8 rounded-md ${product.swatch} ${empty ? 'grayscale' : ''}`} />
                    <span className="block text-[13px] font-medium text-neutral-100">{product.name}</span>
                    <span className="mt-0.5 flex items-center justify-between text-[12px] text-neutral-400">
                      <span>₹{product.price}</span>
                      <span className={updated ? 'font-medium text-amber-300' : ''}>
                        {empty ? 'Sold out' : `×${product.stock}`}
                      </span>
                    </span>
                  </button>
                  <span className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-neutral-500">Qty</span>
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Decrease ${product.name} quantity`}
                        disabled={empty || busy || !!tray || count <= 0}
                        onClick={() => changeQuantity(product, count - 1)}
                        className="h-6 w-6 rounded border border-neutral-700 bg-neutral-900 text-[14px] leading-none text-neutral-200 disabled:cursor-not-allowed disabled:text-neutral-600"
                      >
                        −
                      </button>
                      <span className="w-4 text-center font-mono text-[13px] text-neutral-100">{count}</span>
                      <button
                        type="button"
                        aria-label={`Increase ${product.name} quantity`}
                        disabled={empty || busy || !!tray || count >= product.stock}
                        onClick={() => changeQuantity(product, count + 1)}
                        className="h-6 w-6 rounded border border-neutral-700 bg-neutral-900 text-[14px] leading-none text-neutral-200 disabled:cursor-not-allowed disabled:text-neutral-600"
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
          <div className="rounded-lg border border-neutral-800 bg-black px-3 py-3 text-white">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Screen</div>
            {busy ? (
              <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide">
                {STEPS.map((label, index) => {
                  const reached = phaseIndex(phase);
                  const done = index < reached;
                  const current = index === reached;
                  return (
                    <span key={label} className="flex items-center gap-1">
                      {index > 0 ? <span className="text-neutral-600">→</span> : null}
                      <span
                        className={
                          current
                            ? 'rounded bg-emerald-400/15 px-1 py-0.5 text-emerald-300'
                            : done
                              ? 'text-emerald-300'
                              : 'text-neutral-600'
                        }
                      >
                        {label}
                      </span>
                    </span>
                  );
                })}
              </div>
            ) : null}
            <div className="mt-1 min-h-10 text-sm leading-snug text-emerald-300">{message}</div>
            {displayLines.length > 0 && (tray === null || busy) ? (
              <div className="mt-2 max-h-36 space-y-1 overflow-auto font-mono text-[12px] text-neutral-300">
                {displayLines.map((line) => (
                  <div key={line.product.id} className="flex justify-between gap-2">
                    <span>
                      {line.product.name} ×{line.count}
                    </span>
                    <span>₹{line.product.price * line.count}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-2 border-t border-neutral-800 pt-1 text-neutral-100">
                  <span>Total ₹{displayTotal}</span>
                  <span>Paid ₹{inserted}</span>
                </div>
                {busy ? (
                  <div className="flex justify-between gap-2 text-neutral-100">
                    <span>Change</span>
                    <span>₹{Math.max(0, inserted - displayTotal)}</span>
                  </div>
                ) : null}
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
                className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-[12px] font-medium text-neutral-100 hover:border-neutral-500 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-600"
              >
                ₹{note}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={cancel}
            disabled={busy || !!tray || (order.length === 0 && inserted === 0)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-[12px] font-medium text-neutral-300 hover:border-neutral-500 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-600"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="mx-3 mb-3 flex items-stretch gap-2">
        <div className="grid min-h-24 flex-1 grid-cols-2 gap-2 rounded-lg bg-neutral-800 p-2">
          <TraySlot label="Items">
            {tray && tray.items.length > 0 ? (
              <span className="flex flex-wrap gap-x-3 gap-y-1.5">
                {tray.items.map((item) => (
                  <span key={item.name} className="flex items-center gap-1.5">
                    <span className={`h-5 w-5 shrink-0 rounded ${item.swatch}`} />
                    <span className="text-[12px] font-medium text-white">
                      {item.name}
                      <span className="ml-1 font-normal text-neutral-300">×{item.count}</span>
                    </span>
                  </span>
                ))}
              </span>
            ) : (
              <TrayEmpty />
            )}
          </TraySlot>
          <TraySlot label="Change">
            {tray && tray.change.length > 0 ? (
              <span className="flex flex-wrap gap-1">
                {tray.change.map((note, index) => (
                  <span
                    key={`${note}-${index}`}
                    className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px] font-medium text-neutral-800"
                  >
                    ₹{note}
                  </span>
                ))}
              </span>
            ) : (
              <TrayEmpty label={tray ? 'None' : 'Empty'} />
            )}
          </TraySlot>
        </div>
        <div className="flex w-24 flex-col justify-center gap-1.5">
          <button
            type="button"
            onClick={collect}
            disabled={phase !== 'ready' && !(phase === 'idle' && tray !== null)}
            className="rounded-md bg-white px-2 py-1.5 text-[12px] font-medium text-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
          >
            Collect
          </button>
          <button
            type="button"
            onClick={restock}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-[12px] font-medium text-neutral-300 hover:border-neutral-500"
          >
            Restock
          </button>
        </div>
      </div>
    </div>
  );
}
