'use client';

import { useState } from 'react';
import { highlight } from 'sugar-high';
import { CopyCodeButton } from './copy-code-button';
import { ProviderMenu, type CodeSample } from './code-output-panel';

export function CodeSamplesPanel({ samples }: { samples: CodeSample[] }) {
  const [selected, setSelected] = useState(0);
  const sample = samples[Math.min(selected, samples.length - 1)];

  if (!sample) return null;

  return (
    <div className="code-output my-6 flex h-[80dvh] flex-col overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-100 px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-950">
        {samples.length > 1 ? (
          <ProviderMenu
            codes={samples}
            selected={Math.min(selected, samples.length - 1)}
            onSelect={setSelected}
            menuLabel="Implementation"
            align="left"
          />
        ) : (
          <span />
        )}
        <span className="flex items-center gap-2">
          {sample.language ? (
            <span className="font-mono text-[11px] text-neutral-400">{sample.language}</span>
          ) : null}
          <CopyCodeButton text={sample.source} inline />
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-900">
        <pre className="m-0 w-max min-w-full px-3 py-3 text-[13px] whitespace-pre text-neutral-800 dark:text-neutral-200">
          <code dangerouslySetInnerHTML={{ __html: highlight(sample.source) }} />
        </pre>
      </div>
    </div>
  );
}
