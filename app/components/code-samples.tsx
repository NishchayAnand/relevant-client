import React from 'react';
import { CodeSamplesPanel } from './code-samples-panel';
import type { CodeSample } from './code-output-panel';

/**
 * One code pane with a dropdown for each fenced implementation.
 * Leave a blank line after the opening tag so MDX parses the fences.
 * Labels come from the class, interface, enum, or record name.
 */
export function CodeSamples({ children }: { children?: React.ReactNode }) {
  const samples: CodeSample[] = React.Children.toArray(children)
    .filter(React.isValidElement)
    .map((pane, index) => {
      const source = nodeText(pane).replace(/\n$/, '');
      return {
        label: sampleLabel(source, index),
        source,
        language: nodeLanguage(pane) ?? '',
      };
    })
    .filter((sample) => sample.source.trim().length > 0);

  if (samples.length === 0) return null;

  return <CodeSamplesPanel samples={samples} />;
}

function sampleLabel(source: string, index: number) {
  const match = /(?:class|interface|enum|record)\s+(\w+)/.exec(source);
  return match?.[1] ?? `Implementation ${index + 1}`;
}

function nodeText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(nodeText).join('');
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return nodeText(node.props.children);
  }
  return '';
}

function nodeLanguage(node: React.ReactNode): string | undefined {
  if (!React.isValidElement<{ className?: string; children?: React.ReactNode }>(node)) {
    return undefined;
  }
  const match = /language-([\w-]+)/.exec(node.props.className ?? '');
  if (match) return match[1];
  return nodeLanguage(node.props.children);
}
