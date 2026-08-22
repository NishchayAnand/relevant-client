'use client';

import { useEffect, useId, useState } from 'react';

type MermaidProps = {
  chart: string;
};

const themeVariables = {
  darkMode: false,
  background: '#f8fafc',
  fontFamily: 'inherit',
  fontSize: '15px',

  primaryColor: '#dbeafe',
  primaryTextColor: '#1e3a8a',
  primaryBorderColor: '#3b82f6',
  secondaryColor: '#d1fae5',
  secondaryTextColor: '#064e3b',
  secondaryBorderColor: '#10b981',
  tertiaryColor: '#fef3c7',
  tertiaryTextColor: '#78350f',
  tertiaryBorderColor: '#d97706',

  lineColor: '#64748b',
  textColor: '#334155',
  mainBkg: '#dbeafe',
  nodeBkg: '#dbeafe',
  nodeBorder: '#3b82f6',
  nodeTextColor: '#1e3a8a',
  clusterBkg: '#ecfdf5',
  clusterBorder: '#10b981',
  titleColor: '#0f172a',
  edgeLabelBackground: '#ffffff',
  defaultLinkColor: '#64748b',
  arrowheadColor: '#475569',

  actorBkg: '#e0e7ff',
  actorBorder: '#6366f1',
  actorTextColor: '#312e81',
  actorLineColor: '#818cf8',
  signalColor: '#334155',
  signalTextColor: '#1e293b',
  labelBoxBkgColor: '#dbeafe',
  labelBoxBorderColor: '#3b82f6',
  labelTextColor: '#1e3a8a',
  loopTextColor: '#4338ca',
  activationBkgColor: '#c7d2fe',
  activationBorderColor: '#4f46e5',
  sequenceNumberColor: '#ffffff',
  noteBkgColor: '#fef9c3',
  noteTextColor: '#713f12',
  noteBorderColor: '#eab308',

  classText: '#1e3a8a',
  attributeBackgroundColorOdd: '#eff6ff',
  attributeBackgroundColorEven: '#ffffff',
  relationColor: '#64748b',
  relationLabelBackground: '#ffffff',
  relationLabelColor: '#334155',

  fillType0: '#dbeafe',
  fillType1: '#d1fae5',
  fillType2: '#fef3c7',
  fillType3: '#ede9fe',
  fillType4: '#ffe4e6',
  fillType5: '#cffafe',
  fillType6: '#ffedd5',
  fillType7: '#f3e8ff',

  cScale0: '#3b82f6',
  cScale1: '#10b981',
  cScale2: '#f59e0b',
  cScale3: '#8b5cf6',
  cScale4: '#ef4444',
  cScale5: '#06b6d4',
  cScale6: '#f97316',
  cScale7: '#ec4899',
  cScale8: '#84cc16',
  cScale9: '#6366f1',
  cScale10: '#14b8a6',
  cScale11: '#a855f7',

  pie1: '#3b82f6',
  pie2: '#10b981',
  pie3: '#f59e0b',
  pie4: '#8b5cf6',
  pie5: '#ef4444',
  pie6: '#06b6d4',
  pie7: '#f97316',
  pie8: '#ec4899',
  pieStrokeColor: '#ffffff',
  pieOuterStrokeColor: '#e2e8f0',

  stateBkg: '#dbeafe',
  stateLabelColor: '#1e3a8a',
  transitionColor: '#64748b',
  compositeBackground: '#eef2ff',
  altBackground: '#ecfdf5',

  taskBkgColor: '#dbeafe',
  taskBorderColor: '#3b82f6',
  activeTaskBkgColor: '#d1fae5',
  activeTaskBorderColor: '#10b981',
  doneTaskBkgColor: '#e2e8f0',
  critBkgColor: '#fee2e2',
  critBorderColor: '#ef4444',
  sectionBkgColor: '#e0e7ff',
  altSectionBkgColor: '#ecfdf5',
  gridColor: '#cbd5e1',
  todayLineColor: '#ef4444',
};

const themeCSS = `
  .actor { stroke-width: 1.75px; }
  .messageLine0, .messageLine1 { stroke-width: 1.6px; }
  .activation0, .activation1, .activation2 { stroke-width: 1.5px; }
  .note { stroke-width: 1.5px; }
  .classGroup rect { rx: 8px; ry: 8px; }
  .cluster rect { rx: 10px; ry: 10px; }
  .node rect, .node polygon, .node circle, .node ellipse { stroke-width: 1.6px; }
`;

let mermaidReady: Promise<typeof import('mermaid')['default']> | null = null;

function loadMermaid() {
  if (!mermaidReady) {
    mermaidReady = import('mermaid').then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        fontFamily: 'inherit',
        themeVariables,
        themeCSS,
        flowchart: { htmlLabels: true, curve: 'basis', padding: 16 },
        sequence: { useMaxWidth: true, mirrorActors: false, actorMargin: 50 },
        class: { useMaxWidth: true },
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
      className="mermaid-diagram my-8 flex justify-center overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 sm:px-8 [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

Mermaid.displayName = 'Mermaid';
