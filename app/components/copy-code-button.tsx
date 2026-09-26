'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyCodeButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopied(true);
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? 'Copied' : 'Copy code'}
      className={`absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
        copied
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:text-neutral-800'
      }`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
