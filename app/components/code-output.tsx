import React from 'react';
import { CodeOutputPanel, type CodeSample } from './code-output-panel';

/**
 * Side-by-side code and its printed result, for embedding in a post.
 *
 * The first fenced block is the source. The last block is the output.
 * Extra code blocks before a markdown output become a provider dropdown.
 * Leave a blank line after the opening tag so MDX parses the fences.
 *
 * ```mdx
 * <CodeOutput>
 *
 * ```python
 * print("hello")
 * ```
 *
 * ```markdown
 * hello
 * ```
 *
 * </CodeOutput>
 * ```
 */
export function CodeOutput({
  children,
  codeLabel = 'Code',
  outputLabel = 'Output',
}: {
  children?: React.ReactNode;
  codeLabel?: string;
  outputLabel?: string;
}) {
  const panes = React.Children.toArray(children).filter(React.isValidElement);
  const split = splitPanes(panes);

  if (!split) {
    return null;
  }

  const outputLanguage = nodeLanguage(split.output);
  const codes: CodeSample[] = split.codes.map((pane, index) => {
    const source = nodeText(pane).replace(/\n$/, '');
    return {
      label: providerLabel(source, index),
      source,
      language: nodeLanguage(pane) ?? '',
    };
  });

  return (
    <CodeOutputPanel
      codes={codes}
      output={{
        source: nodeText(split.output).replace(/\n$/, ''),
        markdown: outputLanguage === 'markdown' || outputLanguage === 'md',
      }}
      codeLabel={codeLabel}
      outputLabel={outputLabel}
    />
  );
}

const PROVIDERS: { pattern: RegExp; label: string }[] = [
  { pattern: /openai/i, label: 'OpenAI' },
  { pattern: /anthropic/i, label: 'Anthropic' },
  { pattern: /google|genai/i, label: 'Google' },
];

function providerLabel(source: string, index: number) {
  return PROVIDERS.find((provider) => provider.pattern.test(source))?.label ?? `Option ${index + 1}`;
}

function splitPanes(panes: React.ReactElement[]) {
  if (panes.length < 2) return null;
  const output = panes[panes.length - 1];
  const outputLanguage = nodeLanguage(output);
  const outputIsMarkdown = outputLanguage === 'markdown' || outputLanguage === 'md';
  if (outputIsMarkdown) {
    return { codes: panes.slice(0, -1), output };
  }
  return { codes: [panes[0]], output: panes[1] };
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
