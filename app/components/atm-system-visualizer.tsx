"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Check,
  CreditCard,
  Delete,
  Landmark,
  Loader2,
  Lock,
  RotateCcw,
  ShieldAlert,
  X,
} from "lucide-react";

// ─── Domain constants ─────────────────────────────────────────────────────────

const CORRECT_PIN = "1234";
const MAX_PIN_ATTEMPTS = 3;

type Account = "current" | "savings";
type TxType = "withdrawal" | "deposit" | "balance";

const ACCOUNT_LABEL: Record<Account, string> = {
  current: "Current Account",
  savings: "Savings Account",
};

const INITIAL_BALANCES: Record<Account, number> = {
  current: 5000,
  savings: 12500,
};

const QUICK_AMOUNTS = [20, 50, 100, 200, 500];
const WITHDRAWAL_MULTIPLE = 20;
const WITHDRAWAL_MAX = 1000;
const DEPOSIT_MULTIPLE = 20;

const BILL_DENOMS = [100, 50, 20];

function billBreakdown(amount: number): { denom: number; count: number }[] {
  const result: { denom: number; count: number }[] = [];
  let rem = amount;
  for (const d of BILL_DENOMS) {
    const c = Math.floor(rem / d);
    if (c > 0) result.push({ denom: d, count: c });
    rem -= c * d;
  }
  return result;
}

function formatMoney(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

// ─── Screen type ──────────────────────────────────────────────────────────────

type Screen =
  | "idle"
  | "reading_card"
  | "pin"
  | "account_select"
  | "transaction_select"
  | "amount_entry"
  | "processing"
  | "withdrawal_success"
  | "insufficient_funds"
  | "deposit_prompt"
  | "deposit_processing"
  | "deposit_success"
  | "balance_display"
  | "another_transaction"
  | "take_card"
  | "card_blocked";

type LogEntry = {
  time: string;
  message: string;
  kind: "info" | "success" | "error";
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function timeNow(): string {
  const d = new Date();
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// ─── Keypad ───────────────────────────────────────────────────────────────────

function Keypad({
  onDigit,
  onBackspace,
  onClear,
  disabled,
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const btn =
    "h-10 rounded-md bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-100 font-mono text-lg font-semibold transition-colors border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed";
  return (
    <div className="grid grid-cols-3 gap-1.5 w-full max-w-[220px] mx-auto">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(d => (
        <button
          key={d}
          type="button"
          disabled={disabled}
          onClick={() => onDigit(d)}
          className={btn}
        >
          {d}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={onClear}
        className={`${btn} text-xs`}
      >
        Clear
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDigit("0")}
        className={btn}
      >
        0
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onBackspace}
        className={`${btn} flex items-center justify-center`}
      >
        <Delete size={16} />
      </button>
    </div>
  );
}

// ─── PIN dots ─────────────────────────────────────────────────────────────────

function PinDots({
  value,
  length,
  error,
}: {
  value: string;
  length: number;
  error: boolean;
}) {
  return (
    <div
      className="flex items-center justify-center gap-3"
      style={{
        animation: error ? "atmShake 0.35s" : undefined,
      }}
    >
      {Array.from({ length }).map((_, i) => {
        const filled = i < value.length;
        return (
          <div
            key={i}
            className="w-4 h-4 rounded-full transition-colors"
            style={{
              background: error
                ? "#ef4444"
                : filled
                  ? "#10b981"
                  : "transparent",
              border: `2px solid ${
                error ? "#ef4444" : filled ? "#10b981" : "#475569"
              }`,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Card slot (SVG) ──────────────────────────────────────────────────────────

type CardPos = "out" | "inserting" | "in" | "ejecting" | "ejected" | "retained";

function CardSlot({ pos }: { pos: CardPos }) {
  // The slot is a horizontal 100px wide slit. The card is 90x54, slides down-into-it.
  // We render the card *above* the slot when out and animate its Y as it goes in.
  const cardY =
    pos === "out"
      ? -46
      : pos === "inserting"
        ? 6
        : pos === "in"
          ? 22
          : pos === "ejecting"
            ? -6
            : pos === "ejected"
              ? -46
              : /* retained */ 22;
  const cardOpacity = pos === "retained" ? 0.35 : 1;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative"
        style={{ width: 110, height: 72, overflow: "hidden" }}
      >
        {/* Card */}
        <div
          style={{
            position: "absolute",
            left: 10,
            top: cardY,
            width: 90,
            height: 54,
            borderRadius: 6,
            background:
              "linear-gradient(135deg, #38bdf8 0%, #6366f1 60%, #9333ea 100%)",
            boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
            transition: "top 0.6s ease-in-out, opacity 0.3s",
            opacity: cardOpacity,
            zIndex: 1,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              width: 16,
              height: 12,
              background:
                "linear-gradient(135deg, #fcd34d, #f59e0b, #b45309)",
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 6,
              left: 6,
              right: 6,
              fontFamily: "monospace",
              fontSize: 8,
              color: "rgba(255,255,255,0.9)",
              letterSpacing: 1,
            }}
          >
            •••• •••• •••• 4242
          </div>
        </div>
        {/* Slot bezel */}
        <div
          style={{
            position: "absolute",
            left: 4,
            bottom: 0,
            right: 4,
            height: 22,
            background:
              "linear-gradient(180deg, #1f2937 0%, #0f172a 60%, #020617 100%)",
            borderRadius: 4,
            border: "1px solid #0f172a",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6)",
            zIndex: 2,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 6,
              right: 6,
              top: 4,
              height: 3,
              background: "#020617",
              borderRadius: 2,
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9)",
            }}
          />
        </div>
      </div>
      <div className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
        <CreditCard size={11} /> Card
      </div>
    </div>
  );
}

// ─── Cash slot ────────────────────────────────────────────────────────────────

type CashPhase = "idle" | "dispensing" | "collect" | "depositing" | "deposited";

function CashSlot({
  phase,
  bills,
}: {
  phase: CashPhase;
  bills: { denom: number; count: number }[];
}) {
  const showBills = phase === "dispensing" || phase === "collect";
  const depositAnim = phase === "depositing" || phase === "deposited";

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative"
        style={{ width: 170, height: 72, overflow: "hidden" }}
      >
        {/* Emerging bills */}
        {showBills && (
          <div
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              top: phase === "collect" ? -30 : -6,
              height: 44,
              transition: "top 0.8s ease-out",
              zIndex: 1,
            }}
          >
            <div className="flex items-end justify-center gap-1 h-full">
              {bills.map((b, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center rounded-sm shadow"
                  style={{
                    width: 34,
                    height: 24,
                    background:
                      b.denom === 100
                        ? "linear-gradient(135deg, #86efac, #22c55e)"
                        : b.denom === 50
                          ? "linear-gradient(135deg, #bef264, #84cc16)"
                          : "linear-gradient(135deg, #fde68a, #f59e0b)",
                    border: "1px solid rgba(0,0,0,0.15)",
                    color: "#052e16",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    fontSize: 10,
                    lineHeight: 1,
                  }}
                >
                  ${b.denom}
                  <span
                    style={{ fontSize: 8, fontWeight: 600, opacity: 0.7 }}
                  >
                    × {b.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Deposit going in */}
        {depositAnim && (
          <div
            style={{
              position: "absolute",
              left: 55,
              top: phase === "deposited" ? 40 : -30,
              width: 60,
              height: 30,
              transition: "top 0.9s ease-in",
              zIndex: 1,
            }}
          >
            <div className="flex flex-col gap-0.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    height: 6,
                    background:
                      "linear-gradient(90deg, #86efac 0%, #22c55e 100%)",
                    borderRadius: 2,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Slot bezel (wider than card slot) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            right: 0,
            height: 32,
            background:
              "linear-gradient(180deg, #1f2937 0%, #0f172a 60%, #020617 100%)",
            borderRadius: 6,
            border: "1px solid #0f172a",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6)",
            zIndex: 2,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 8,
              right: 8,
              top: 6,
              height: 4,
              background: "#020617",
              borderRadius: 2,
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9)",
            }}
          />
        </div>
      </div>
      <div className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
        <Banknote size={11} /> Cash / Deposit
      </div>
    </div>
  );
}

// ─── Screen shell ─────────────────────────────────────────────────────────────

function ScreenTitle({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center gap-2 text-slate-200 text-sm font-semibold">
      {icon}
      <span>{children}</span>
    </div>
  );
}

function ScreenButton({
  onClick,
  variant = "primary",
  children,
  disabled,
  full,
}: {
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children: React.ReactNode;
  disabled?: boolean;
  full?: boolean;
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-400",
    secondary:
      "bg-slate-700 hover:bg-slate-600 text-slate-100 border-slate-600",
    danger: "bg-red-500 hover:bg-red-400 text-white border-red-400",
    ghost:
      "bg-transparent hover:bg-slate-700 text-slate-300 border-slate-600",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        full ? "w-full" : ""
      } ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

// ─── Side panel ───────────────────────────────────────────────────────────────

function SidePanel({
  screen,
  pinAttempts,
  account,
  txType,
  balances,
  log,
}: {
  screen: Screen;
  pinAttempts: number;
  account: Account | null;
  txType: TxType | null;
  balances: Record<Account, number>;
  log: LogEntry[];
}) {
  const cardStatus =
    screen === "idle"
      ? "No card"
      : screen === "card_blocked"
        ? "Retained (blocked)"
        : screen === "take_card"
          ? "Ejecting"
          : "Inserted";

  const remainingAttempts = MAX_PIN_ATTEMPTS - pinAttempts;

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {/* Session */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
          Session
        </span>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <span className="text-gray-500">Card</span>
          <span
            className="font-mono font-semibold"
            style={{
              color:
                screen === "card_blocked"
                  ? "#dc2626"
                  : screen === "idle"
                    ? "#9ca3af"
                    : "#065f46",
            }}
          >
            {cardStatus}
          </span>
          <span className="text-gray-500">PIN attempts</span>
          <span className="font-mono">
            <span
              style={{
                color:
                  remainingAttempts <= 1
                    ? "#dc2626"
                    : remainingAttempts <= 2
                      ? "#d97706"
                      : "#065f46",
              }}
            >
              {remainingAttempts}
            </span>
            <span className="text-gray-400"> / {MAX_PIN_ATTEMPTS}</span>
          </span>
          <span className="text-gray-500">Account</span>
          <span className="font-mono">
            {account ? ACCOUNT_LABEL[account] : "—"}
          </span>
          <span className="text-gray-500">Transaction</span>
          <span className="font-mono capitalize">{txType ?? "—"}</span>
        </div>
      </div>

      {/* Balances */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
          Balances
        </span>
        {(["current", "savings"] as Account[]).map(a => (
          <div
            key={a}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-md border border-gray-200 bg-gray-50"
          >
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase">
                {ACCOUNT_LABEL[a]}
              </span>
              <span className="text-[9px] text-gray-400 font-mono">
                •••• 4242
              </span>
            </div>
            <span className="text-sm font-mono font-bold text-gray-800 tabular-nums">
              {formatMoney(balances[a])}
            </span>
          </div>
        ))}
      </div>

      {/* Log */}
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
          Activity
        </span>
        <div className="flex flex-col gap-1 overflow-y-auto max-h-56 min-h-0 pr-1">
          {log.length === 0 ? (
            <span className="text-xs text-gray-400 italic">
              Nothing yet.
            </span>
          ) : (
            log.map((entry, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-[11px] leading-tight"
              >
                <span className="text-gray-400 font-mono tabular-nums shrink-0">
                  {entry.time}
                </span>
                <span
                  style={{
                    color:
                      entry.kind === "success"
                        ? "#047857"
                        : entry.kind === "error"
                          ? "#b91c1c"
                          : "#374151",
                  }}
                >
                  {entry.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AtmSystemVisualizer() {
  const [screen, setScreen] = useState<Screen>("idle");
  const [pin, setPin] = useState("");
  const [pinAttempts, setPinAttempts] = useState(0);
  const [pinError, setPinError] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [txType, setTxType] = useState<TxType | null>(null);
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [balances, setBalances] =
    useState<Record<Account, number>>(INITIAL_BALANCES);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [lastTxAmount, setLastTxAmount] = useState(0);

  const cardPos: CardPos = useMemo(() => {
    if (screen === "idle") return "out";
    if (screen === "reading_card") return "inserting";
    if (screen === "take_card") return "ejecting";
    if (screen === "card_blocked") return "retained";
    return "in";
  }, [screen]);

  const cashPhase: CashPhase = useMemo(() => {
    if (screen === "withdrawal_success") return "dispensing";
    if (screen === "deposit_prompt") return "idle";
    if (screen === "deposit_processing") return "depositing";
    if (screen === "deposit_success") return "deposited";
    return "idle";
  }, [screen]);

  const appendLog = useCallback(
    (message: string, kind: LogEntry["kind"] = "info") => {
      setLog(l => [{ time: timeNow(), message, kind }, ...l].slice(0, 30));
    },
    [],
  );

  // Reset back to idle (fresh card scenario)
  const fullReset = useCallback(() => {
    setScreen("idle");
    setPin("");
    setPinAttempts(0);
    setPinError(false);
    setAccount(null);
    setTxType(null);
    setAmount("");
    setAmountError(null);
    setLastTxAmount(0);
  }, []);

  // Reset only the session (card removed)
  const endSession = useCallback(() => {
    setScreen("take_card");
    appendLog("Ejecting card. Session ended.", "info");
    setPin("");
    setPinAttempts(0);
    setPinError(false);
  }, [appendLog]);

  // ── Timers for auto-transitions ─────────────────────────────────────────────

  useEffect(() => {
    if (screen === "reading_card") {
      const t = setTimeout(() => {
        setScreen("pin");
      }, 800);
      return () => clearTimeout(t);
    }
    if (screen === "processing") {
      const t = setTimeout(() => {
        // Move to result based on txType
        if (txType === "withdrawal") {
          const amt = parseInt(amount, 10);
          if (!account) return;
          if (amt > balances[account]) {
            setScreen("insufficient_funds");
            appendLog(
              `Withdrawal ${formatMoney(amt)} denied — insufficient funds.`,
              "error",
            );
          } else {
            setBalances(b => ({ ...b, [account]: b[account] - amt }));
            setLastTxAmount(amt);
            setScreen("withdrawal_success");
            appendLog(
              `Withdrew ${formatMoney(amt)} from ${ACCOUNT_LABEL[account]}.`,
              "success",
            );
          }
        } else if (txType === "balance") {
          setScreen("balance_display");
          appendLog(
            `Checked balance of ${ACCOUNT_LABEL[account!]}.`,
            "info",
          );
        }
      }, 900);
      return () => clearTimeout(t);
    }
    if (screen === "deposit_processing") {
      const t = setTimeout(() => {
        const amt = parseInt(amount, 10);
        if (!account) return;
        setBalances(b => ({ ...b, [account]: b[account] + amt }));
        setLastTxAmount(amt);
        setScreen("deposit_success");
        appendLog(
          `Deposited ${formatMoney(amt)} into ${ACCOUNT_LABEL[account]}.`,
          "success",
        );
      }, 1000);
      return () => clearTimeout(t);
    }
    if (screen === "card_blocked") {
      const t = setTimeout(() => {
        fullReset();
        appendLog("New card available. Ready for a new session.", "info");
      }, 3500);
      return () => clearTimeout(t);
    }
    if (screen === "take_card") {
      // No auto-transition; user clicks Take Card
    }
  }, [
    screen,
    txType,
    amount,
    account,
    balances,
    appendLog,
    fullReset,
  ]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const insertCard = () => {
    setScreen("reading_card");
    appendLog("Card inserted.", "info");
  };

  const handlePinDigit = (d: string) => {
    if (pin.length >= 4) return;
    setPinError(false);
    setPin(p => p + d);
  };
  const handlePinBackspace = () => {
    setPinError(false);
    setPin(p => p.slice(0, -1));
  };
  const handlePinClear = () => {
    setPinError(false);
    setPin("");
  };

  // Auto-submit PIN when 4 digits entered
  useEffect(() => {
    if (screen !== "pin" || pin.length !== 4) return;
    const t = setTimeout(() => {
      if (pin === CORRECT_PIN) {
        appendLog("PIN accepted.", "success");
        setPin("");
        setPinAttempts(0);
        setScreen("account_select");
      } else {
        const next = pinAttempts + 1;
        setPinAttempts(next);
        setPinError(true);
        if (next >= MAX_PIN_ATTEMPTS) {
          appendLog(
            "Third incorrect PIN. Card retained.",
            "error",
          );
          setScreen("card_blocked");
        } else {
          appendLog(
            `Incorrect PIN. ${MAX_PIN_ATTEMPTS - next} attempt(s) remaining.`,
            "error",
          );
          setTimeout(() => {
            setPin("");
            setPinError(false);
          }, 500);
        }
      }
    }, 300);
    return () => clearTimeout(t);
  }, [pin, screen, pinAttempts, appendLog]);

  const selectAccount = (a: Account) => {
    setAccount(a);
    setScreen("transaction_select");
    appendLog(`Selected ${ACCOUNT_LABEL[a]}.`, "info");
  };

  const selectTx = (t: TxType) => {
    setTxType(t);
    setAmount("");
    setAmountError(null);
    if (t === "balance") {
      setScreen("processing");
    } else {
      setScreen("amount_entry");
    }
  };

  const handleAmountDigit = (d: string) => {
    if (amount.length >= 5) return; // cap at 99999
    setAmountError(null);
    setAmount(a => (a === "0" ? d : a + d));
  };
  const handleAmountBackspace = () => {
    setAmountError(null);
    setAmount(a => a.slice(0, -1));
  };
  const handleAmountClear = () => {
    setAmountError(null);
    setAmount("");
  };
  const setQuickAmount = (v: number) => {
    setAmountError(null);
    setAmount(String(v));
  };

  const confirmAmount = () => {
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) {
      setAmountError("Enter a positive amount.");
      return;
    }
    if (txType === "withdrawal") {
      if (amt % WITHDRAWAL_MULTIPLE !== 0) {
        setAmountError(`Must be a multiple of $${WITHDRAWAL_MULTIPLE}.`);
        return;
      }
      if (amt > WITHDRAWAL_MAX) {
        setAmountError(`Per-transaction limit is ${formatMoney(WITHDRAWAL_MAX)}.`);
        return;
      }
      setScreen("processing");
    } else if (txType === "deposit") {
      if (amt % DEPOSIT_MULTIPLE !== 0) {
        setAmountError(`Must be a multiple of $${DEPOSIT_MULTIPLE}.`);
        return;
      }
      setScreen("deposit_prompt");
    }
  };

  const confirmDeposit = () => {
    setScreen("deposit_processing");
  };

  const anotherTransactionYes = () => {
    setTxType(null);
    setAmount("");
    setAmountError(null);
    setLastTxAmount(0);
    setScreen("transaction_select");
  };

  const anotherTransactionNo = () => {
    endSession();
  };

  const takeCard = () => {
    appendLog("Card removed.", "info");
    fullReset();
  };

  // ── Screen renderer ────────────────────────────────────────────────────────

  const currentBalance = account ? balances[account] : 0;

  const renderScreen = () => {
    switch (screen) {
      case "idle":
        return (
          <div className="flex flex-col items-center gap-6 py-8">
            <ScreenTitle icon={<Landmark size={16} />}>
              First National Bank
            </ScreenTitle>
            <div className="text-slate-300 text-sm">
              Please insert your card
            </div>
            <button
              type="button"
              onClick={insertCard}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors"
            >
              <CreditCard size={15} /> Insert Card
            </button>
            <div className="text-[10px] text-slate-500">
              Demo card • PIN{" "}
              <span className="font-mono text-slate-400">1234</span>
            </div>
          </div>
        );
      case "reading_card":
        return (
          <div className="flex flex-col items-center gap-4 py-10">
            <Loader2
              size={30}
              className="text-slate-300"
              style={{ animation: "atmSpin 1s linear infinite" }}
            />
            <div className="text-slate-300 text-sm">Reading card…</div>
          </div>
        );
      case "pin":
        return (
          <div className="flex flex-col items-center gap-4 py-3">
            <ScreenTitle icon={<Lock size={14} />}>
              Enter your 4-digit PIN
            </ScreenTitle>
            <PinDots value={pin} length={4} error={pinError} />
            <div className="text-[11px] text-slate-400">
              {pinError
                ? `Incorrect PIN — ${MAX_PIN_ATTEMPTS - pinAttempts} attempt(s) remaining`
                : `Attempts remaining: ${MAX_PIN_ATTEMPTS - pinAttempts}`}
            </div>
            <Keypad
              onDigit={handlePinDigit}
              onBackspace={handlePinBackspace}
              onClear={handlePinClear}
              disabled={pinError && pin.length === 4}
            />
            <div className="flex gap-2 mt-1">
              <ScreenButton variant="ghost" onClick={endSession}>
                <span className="flex items-center gap-1">
                  <X size={11} /> Cancel
                </span>
              </ScreenButton>
            </div>
          </div>
        );
      case "account_select":
        return (
          <div className="flex flex-col items-center gap-4 py-4 w-full">
            <ScreenTitle>Select an account</ScreenTitle>
            <div className="flex flex-col gap-2 w-full max-w-[240px]">
              {(["current", "savings"] as Account[]).map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => selectAccount(a)}
                  className="flex items-center justify-between px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 transition-colors"
                >
                  <span className="text-sm font-medium">
                    {ACCOUNT_LABEL[a]}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    •••• 4242
                  </span>
                </button>
              ))}
            </div>
            <ScreenButton variant="ghost" onClick={endSession}>
              <span className="flex items-center gap-1">
                <X size={11} /> Cancel
              </span>
            </ScreenButton>
          </div>
        );
      case "transaction_select":
        return (
          <div className="flex flex-col items-center gap-4 py-4 w-full">
            <ScreenTitle>Select a transaction</ScreenTitle>
            <div className="flex flex-col gap-2 w-full max-w-[240px]">
              <button
                type="button"
                onClick={() => selectTx("withdrawal")}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 transition-colors"
              >
                <Banknote size={16} className="text-emerald-400" />
                <span className="text-sm font-medium">Withdrawal</span>
              </button>
              <button
                type="button"
                onClick={() => selectTx("deposit")}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 transition-colors"
              >
                <Banknote size={16} className="text-sky-400" />
                <span className="text-sm font-medium">Deposit</span>
              </button>
              <button
                type="button"
                onClick={() => selectTx("balance")}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 transition-colors"
              >
                <Landmark size={16} className="text-slate-300" />
                <span className="text-sm font-medium">Balance Inquiry</span>
              </button>
            </div>
            <ScreenButton variant="ghost" onClick={endSession}>
              <span className="flex items-center gap-1">
                <X size={11} /> Cancel & Exit
              </span>
            </ScreenButton>
          </div>
        );
      case "amount_entry": {
        const isWithdrawal = txType === "withdrawal";
        return (
          <div className="flex flex-col items-center gap-3 py-2 w-full">
            <ScreenTitle>
              {isWithdrawal ? "Withdrawal amount" : "Deposit amount"}
            </ScreenTitle>
            <div className="text-slate-100 text-2xl font-mono font-bold tabular-nums h-9 flex items-center">
              ${amount || "0"}
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {QUICK_AMOUNTS.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setQuickAmount(v)}
                  className={`px-2 py-1 rounded-md border text-[11px] font-mono transition-colors ${
                    amount === String(v)
                      ? "bg-emerald-500 border-emerald-400 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  ${v}
                </button>
              ))}
            </div>
            <Keypad
              onDigit={handleAmountDigit}
              onBackspace={handleAmountBackspace}
              onClear={handleAmountClear}
            />
            {amountError && (
              <div className="text-[11px] text-red-400">{amountError}</div>
            )}
            <div className="text-[10px] text-slate-500">
              {isWithdrawal
                ? `Multiples of $${WITHDRAWAL_MULTIPLE}, max ${formatMoney(WITHDRAWAL_MAX)}. Balance: ${formatMoney(currentBalance)}.`
                : `Multiples of $${DEPOSIT_MULTIPLE}. Balance: ${formatMoney(currentBalance)}.`}
            </div>
            <div className="flex gap-2">
              <ScreenButton
                variant="ghost"
                onClick={() => {
                  setTxType(null);
                  setAmount("");
                  setAmountError(null);
                  setScreen("transaction_select");
                }}
              >
                <span className="flex items-center gap-1">
                  <X size={11} /> Back
                </span>
              </ScreenButton>
              <ScreenButton
                variant="primary"
                onClick={confirmAmount}
                disabled={!amount}
              >
                <span className="flex items-center gap-1">
                  <Check size={11} /> Confirm
                </span>
              </ScreenButton>
            </div>
          </div>
        );
      }
      case "processing":
        return (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2
              size={30}
              className="text-slate-300"
              style={{ animation: "atmSpin 1s linear infinite" }}
            />
            <div className="text-slate-300 text-sm">
              Processing transaction…
            </div>
          </div>
        );
      case "withdrawal_success": {
        const amt = parseInt(amount, 10) || 0;
        const bills = billBreakdown(amt);
        return (
          <div className="flex flex-col items-center gap-3 py-3">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 44,
                height: 44,
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
              }}
            >
              <Check size={22} />
            </div>
            <ScreenTitle>Please collect your cash</ScreenTitle>
            <div className="text-emerald-300 text-2xl font-mono font-bold">
              {formatMoney(amt)}
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center max-w-[280px]">
              {bills.map((b, i) => (
                <div
                  key={i}
                  className="px-2 py-1 rounded-md text-[10px] font-mono font-semibold"
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    color: "#a7f3d0",
                  }}
                >
                  {b.count} × ${b.denom}
                </div>
              ))}
            </div>
            <div className="text-[10px] text-slate-400">
              New balance:{" "}
              <span className="font-mono text-slate-200">
                {formatMoney(currentBalance)}
              </span>
            </div>
            <ScreenButton
              variant="primary"
              onClick={() => setScreen("another_transaction")}
            >
              Continue
            </ScreenButton>
          </div>
        );
      }
      case "insufficient_funds":
        return (
          <div className="flex flex-col items-center gap-3 py-4">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 44,
                height: 44,
                background: "rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
              }}
            >
              <ShieldAlert size={22} />
            </div>
            <ScreenTitle>Insufficient funds</ScreenTitle>
            <div className="text-slate-300 text-xs text-center max-w-[240px]">
              Your {ACCOUNT_LABEL[account!].toLowerCase()} balance is{" "}
              <span className="font-mono text-slate-100">
                {formatMoney(currentBalance)}
              </span>
              . Please enter a smaller amount.
            </div>
            <ScreenButton
              variant="secondary"
              onClick={() => setScreen("amount_entry")}
            >
              Try again
            </ScreenButton>
          </div>
        );
      case "deposit_prompt":
        return (
          <div className="flex flex-col items-center gap-3 py-4">
            <ScreenTitle>Insert cash into the deposit slot</ScreenTitle>
            <div className="text-slate-300 text-xs text-center max-w-[240px]">
              Please insert {formatMoney(parseInt(amount, 10) || 0)} in bills
              into the cash slot below.
            </div>
            <div className="text-slate-400 text-[10px]">
              Ready to accept your deposit
            </div>
            <div className="flex gap-2">
              <ScreenButton
                variant="ghost"
                onClick={() => setScreen("amount_entry")}
              >
                Cancel
              </ScreenButton>
              <ScreenButton variant="primary" onClick={confirmDeposit}>
                <span className="flex items-center gap-1">
                  <Banknote size={12} /> Insert Cash
                </span>
              </ScreenButton>
            </div>
          </div>
        );
      case "deposit_processing":
        return (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2
              size={30}
              className="text-slate-300"
              style={{ animation: "atmSpin 1s linear infinite" }}
            />
            <div className="text-slate-300 text-sm">
              Counting deposited cash…
            </div>
          </div>
        );
      case "deposit_success":
        return (
          <div className="flex flex-col items-center gap-3 py-3">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 44,
                height: 44,
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
              }}
            >
              <Check size={22} />
            </div>
            <ScreenTitle>Deposit received</ScreenTitle>
            <div className="text-emerald-300 text-2xl font-mono font-bold">
              {formatMoney(lastTxAmount)}
            </div>
            <div className="text-[11px] text-slate-300">
              Deposited to {ACCOUNT_LABEL[account!]}
            </div>
            <div className="text-[10px] text-slate-400">
              New balance:{" "}
              <span className="font-mono text-slate-200">
                {formatMoney(currentBalance)}
              </span>
            </div>
            <ScreenButton
              variant="primary"
              onClick={() => setScreen("another_transaction")}
            >
              Continue
            </ScreenButton>
          </div>
        );
      case "balance_display":
        return (
          <div className="flex flex-col items-center gap-3 py-6">
            <ScreenTitle icon={<Landmark size={14} />}>
              Available balance
            </ScreenTitle>
            <div className="text-slate-100 text-3xl font-mono font-bold tabular-nums">
              {formatMoney(currentBalance)}
            </div>
            <div className="text-[11px] text-slate-400">
              {ACCOUNT_LABEL[account!]} • •••• 4242
            </div>
            <ScreenButton
              variant="primary"
              onClick={() => setScreen("another_transaction")}
            >
              Continue
            </ScreenButton>
          </div>
        );
      case "another_transaction":
        return (
          <div className="flex flex-col items-center gap-4 py-6">
            <ScreenTitle>Would you like another transaction?</ScreenTitle>
            <div className="flex gap-2">
              <ScreenButton variant="primary" onClick={anotherTransactionYes}>
                <span className="flex items-center gap-1">
                  <Check size={12} /> Yes
                </span>
              </ScreenButton>
              <ScreenButton variant="secondary" onClick={anotherTransactionNo}>
                <span className="flex items-center gap-1">
                  <X size={12} /> No, end session
                </span>
              </ScreenButton>
            </div>
          </div>
        );
      case "take_card":
        return (
          <div className="flex flex-col items-center gap-4 py-8">
            <ScreenTitle>Please take your card</ScreenTitle>
            <div className="text-slate-300 text-xs">
              Thank you for banking with us.
            </div>
            <ScreenButton variant="primary" onClick={takeCard}>
              <span className="flex items-center gap-1">
                <CreditCard size={12} /> Take Card
              </span>
            </ScreenButton>
          </div>
        );
      case "card_blocked":
        return (
          <div className="flex flex-col items-center gap-4 py-6">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 44,
                height: 44,
                background: "rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
              }}
            >
              <ShieldAlert size={22} />
            </div>
            <ScreenTitle>Card retained</ScreenTitle>
            <div className="text-slate-300 text-xs text-center max-w-[260px]">
              Three incorrect PIN attempts. Please contact your bank to
              reclaim your card.
            </div>
            <div className="text-[10px] text-slate-500">
              A fresh card will be available shortly…
            </div>
          </div>
        );
    }
  };

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">
      {/* Keyframes for animations */}
      <style>{`
        @keyframes atmSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes atmShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {/* Left: ATM body */}
        <div className="p-5 min-w-0 flex justify-center">
          <div
            className="rounded-3xl p-5 shadow-lg"
            style={{
              width: 380,
              maxWidth: "100%",
              background:
                "linear-gradient(180deg, #475569 0%, #334155 40%, #1e293b 100%)",
            }}
          >
            {/* Bank header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2 text-slate-200">
                <div
                  className="flex items-center justify-center rounded-md"
                  style={{
                    width: 26,
                    height: 26,
                    background: "#10b981",
                    color: "#052e16",
                  }}
                >
                  <Landmark size={14} />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] font-semibold">
                    First National Bank
                  </span>
                  <span className="text-[9px] text-slate-400">ATM #A-042</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: "#10b981" }}
                />
                Online
              </div>
            </div>

            {/* Screen */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background:
                  "linear-gradient(180deg, #0f172a 0%, #0b1220 100%)",
                boxShadow:
                  "inset 0 0 0 2px #1e293b, inset 0 4px 12px rgba(0,0,0,0.6)",
                minHeight: 340,
                padding: "16px 12px",
              }}
            >
              {renderScreen()}
            </div>

            {/* Slots */}
            <div className="mt-4 flex items-end justify-between px-1">
              <CashSlot
                phase={cashPhase}
                bills={billBreakdown(
                  screen === "withdrawal_success"
                    ? parseInt(amount, 10) || 0
                    : 0,
                )}
              />
              <CardSlot pos={cardPos} />
            </div>
          </div>
        </div>

        {/* Right: side panel */}
        <div className="p-5 flex flex-col gap-4 min-w-0">
          <SidePanel
            screen={screen}
            pinAttempts={pinAttempts}
            account={account}
            txType={txType}
            balances={balances}
            log={log}
          />
        </div>
      </div>

      {/* Footer controls */}
      <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            fullReset();
            setBalances(INITIAL_BALANCES);
            setLog([]);
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50"
        >
          <RotateCcw size={13} /> Reset ATM & balances
        </button>
        <span className="text-[10px] text-gray-400 ml-auto">
          Demo card • PIN <span className="font-mono">1234</span> • Three wrong
          attempts retain the card.
        </span>
      </div>
    </div>
  );
}
