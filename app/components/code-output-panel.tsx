'use client';

import { useState } from 'react';
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
      <div className="code-output grid h-fit max-h-dvh grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden rounded-lg border border-neutral-200 @2xl:grid-cols-2 @2xl:grid-rows-[minmax(0,1fr)] dark:border-neutral-800">
        <Pane
          label={codeLabel}
          source={code.source}
          language={code.language}
          highlighted
          className="border-b border-neutral-200 @2xl:border-r @2xl:border-b-0 dark:border-neutral-800"
          headerExtra={
            codes.length > 1 ? (
              <label className="inline-flex items-center">
                <span className="sr-only">Model provider</span>
                <select
                  value={Math.min(selected, codes.length - 1)}
                  onChange={(event) => setSelected(Number(event.target.value))}
                  className="rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  {codes.map((sample, index) => (
                    <option key={`${sample.label}-${index}`} value={index}>
                      {sample.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null
          }
        />
        <Pane label={outputLabel} source={output.source} markdown={output.markdown} />
      </div>
    </div>
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
          <pre className="m-0 h-full overflow-x-auto px-3 py-3 text-sm whitespace-pre-wrap break-words text-neutral-800 dark:text-neutral-200">
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
