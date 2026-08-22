'use client';

import { useEffect, useId, useState } from 'react';

type MermaidProps = {
  chart: string;
};

let mermaidReady: Promise<typeof import('mermaid')['default']> | null = null;

function loadMermaid() {
  if (!mermaidReady) {
    mermaidReady = import('mermaid').then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'neutral',
        fontFamily: 'inherit',
      });
      return mermaid;
    });
  }
  return mermaidReady;
}

function toSafeId(reactId: string) {
  return `mermaid-${reactId.replace(/[^a-zA-Z0-9-]/g, '')}`;
}

export function Mermaid({ chart }: MermaidProps) {
  const reactId = useId();
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const definition = chart.trim();
    if (!definition) {
      setSvg('');
      setError(null);
      return;
    }

    let cancelled = false;
    const renderId = toSafeId(reactId);

    loadMermaid()
      .then((mermaid) => mermaid.render(renderId, definition))
      .then(({ svg: rendered }) => {
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSvg('');
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
        }
      });

    return () => {
      cancelled = true;
      document.getElementById(`d${renderId}`)?.remove();
    };
  }, [chart, reactId]);

  if (error) {
    return (
      <pre className="mermaid-diagram mermaid-diagram-error my-8 overflow-x-auto rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {chart.trim()}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="mermaid-diagram my-8 flex min-h-24 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-400">
        Loading diagram…
      </div>
    );
  }

  return (
    <div
      className="mermaid-diagram my-8 flex justify-center overflow-x-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

Mermaid.displayName = 'Mermaid';
