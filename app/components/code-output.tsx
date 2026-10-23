import React from 'react';
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

/**
 * Side-by-side code and its printed result, for embedding in a post.
 *
 * The first fenced block is the source. The second is the output.
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
  const code = panes[0];
  const output = panes[1];

  if (!code || !output) {
    return null;
  }

  const codeSource = nodeText(code).replace(/\n$/, '');
  const outputSource = nodeText(output).replace(/\n$/, '');
  const language = nodeLanguage(code);
  const outputLanguage = nodeLanguage(output);

  return (
    <div className="@container my-6">
      <div className="code-output grid h-fit max-h-dvh grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden rounded-lg border border-neutral-200 @2xl:grid-cols-2 @2xl:grid-rows-[minmax(0,1fr)] dark:border-neutral-800">
        <Pane
          label={codeLabel}
          source={codeSource}
          language={language}
          highlighted
          className="border-b border-neutral-200 @2xl:border-r @2xl:border-b-0 dark:border-neutral-800"
        />
        <Pane
          label={outputLabel}
          source={outputSource}
          markdown={outputLanguage === 'markdown' || outputLanguage === 'md'}
        />
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
}: {
  label: string;
  source: string;
  language?: string;
  highlighted?: boolean;
  markdown?: boolean;
  className?: string;
}) {
  const showLanguage = language && language !== 'text' && language !== 'output';

  return (
    <div className={`flex min-h-0 min-w-0 flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-900 ${className}`}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-100 px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-950">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          {label}
        </span>
        <span className="flex items-center gap-2">
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
