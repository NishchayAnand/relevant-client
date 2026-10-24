'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { Marked } from 'marked';
import { highlight } from 'sugar-high';
import { CopyCodeButton } from './copy-code-button';

const outputMarkdown = new Marked({ gfm: true });

outputMarkdown.use({
  renderer: {
    heading({ tokens }) {
      const text = this.parser.parseInline(tokens);
      return `<p class="md-heading">${text}</p>\n`;
    },
    codespan({ text }) {
      const html = escapeHtml(text).replace(/([,()/=?])/g, '$1<wbr>');
      return `<code>${html}</code>`;
    },
  },
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export type CodeSample = {
  label: string;
  source: string;
  language: string;
};

export function CodeOutputPanel({
  codes,
  output,
  codeLabel,
  outputLabel,
}: {
  codes: CodeSample[];
  output: { source: string; markdown: boolean };
  codeLabel: string;
  outputLabel: string;
}) {
  const [selected, setSelected] = useState(0);
  const code = codes[Math.min(selected, codes.length - 1)];

  if (!code) return null;

  return (
    <div className="@container my-6">
      <div className="code-output grid h-[50dvh] grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden rounded-lg border border-neutral-200 @2xl:grid-cols-2 @2xl:grid-rows-[minmax(0,1fr)] dark:border-neutral-800">
        <Pane
          label={codeLabel}
          source={code.source}
          language={code.language}
          highlighted
          className="border-b border-neutral-200 @2xl:border-r @2xl:border-b-0 dark:border-neutral-800"
          headerExtra={
            codes.length > 1 ? (
              <ProviderMenu
                codes={codes}
                selected={Math.min(selected, codes.length - 1)}
                onSelect={setSelected}
              />
            ) : null
          }
        />
        <Pane label={outputLabel} source={output.source} markdown={output.markdown} />
      </div>
    </div>
  );
}

function ProviderMenu({
  codes,
  selected,
  onSelect,
}: {
  codes: CodeSample[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selected);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function placeMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, 148);
    const height = codes.length * 32 + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < height + 8 ? Math.max(8, rect.top - height - 4) : rect.bottom + 4;
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    setMenuStyle({ top, left, width });
  }

  useEffect(() => {
    if (!open) return;
    placeMenu();
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', placeMenu);
    window.addEventListener('scroll', placeMenu, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', placeMenu);
      window.removeEventListener('scroll', placeMenu, true);
    };
  }, [open, codes.length]);

  function choose(index: number) {
    onSelect(index);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setActive(selected);
      placeMenu();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(codes.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(active);
    }
  }

  const menu =
    open && menuStyle
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label="Model provider"
            style={{ top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}
            className="fixed z-50 rounded-md border border-neutral-200 bg-white p-1 shadow-lg shadow-neutral-900/5"
          >
            {codes.map((sample, index) => {
              const isSelected = index === selected;
              const isActive = index === active;
              return (
                <button
                  key={`${sample.label}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(index)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] ${
                    isActive ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600'
                  }`}
                >
                  <Check size={12} className={isSelected ? 'text-neutral-800' : 'opacity-0'} />
                  <span className={isSelected ? 'font-medium' : ''}>{sample.label}</span>
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Model provider"
        onKeyDown={onTriggerKeyDown}
        onClick={() => {
          setActive(selected);
          if (!open) placeMenu();
          setOpen((value) => !value);
        }}
        className={`inline-flex shrink-0 items-center gap-1 rounded-md border bg-white px-2 py-1 text-[11px] font-medium transition-colors ${
          open
            ? 'border-neutral-300 text-neutral-800'
            : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:text-neutral-800'
        }`}
      >
        {codes[selected]?.label}
        <ChevronDown size={12} className={`text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {menu}
    </>
  );
}

function Pane({
  label,
  source,
  language,
  highlighted = false,
  markdown = false,
  className = '',
  headerExtra = null,
}: {
  label: string;
  source: string;
  language?: string;
  highlighted?: boolean;
  markdown?: boolean;
  className?: string;
  headerExtra?: React.ReactNode;
}) {
  const showLanguage = language && language !== 'text' && language !== 'output';

  return (
    <div className={`flex min-h-0 min-w-0 flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-900 ${className}`}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-100 px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-950">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          {label}
        </span>
        <span className="flex items-center gap-2">
          {headerExtra}
          {showLanguage ? (
            <span className="font-mono text-[11px] text-neutral-400">{language}</span>
          ) : null}
          <CopyCodeButton text={source} inline />
        </span>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">
        {markdown ? (
          <div
            className="markdown-output px-4 py-3 text-sm leading-relaxed text-neutral-800 dark:text-neutral-200"
            dangerouslySetInnerHTML={{
              __html: outputMarkdown.parse(source, { async: false }),
            }}
          />
        ) : (
          <pre className="m-0 w-max min-w-full px-3 py-3 text-[13px] whitespace-pre text-neutral-800 dark:text-neutral-200">
            {highlighted ? (
              <code dangerouslySetInnerHTML={{ __html: highlight(source) }} />
            ) : (
              <code>{source}</code>
            )}
          </pre>
        )}
      </div>
    </div>
  );
}
