import Link from 'next/link';
import Image from 'next/image';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { highlight } from 'sugar-high';
import hljs from 'highlight.js';
import javascript from 'highlight.js/lib/languages/javascript';
import React from 'react';
import remarkGfm from "remark-gfm";
import RemoveElementVisualizer from './remove-element-visualizer';
import TwoPointerVisualizer from './two-pointer-visualizer';
import MajorityElementFrequencyMapVisualizer from './majority-element-frequency-map';
import MajorityElementSortingVisualizer from './majority-element-sorting';
import FindDuplicateFloydVisualizer from './find-duplicate-floyd-visualizer';
import DetectCycleVisitedSetVisualizer from './detect-cycle-visited-set-visualizer';
import StripCollisionVisualizer from './strip-collision-visualizer';

hljs.registerLanguage('javascript', javascript);

interface TableData {
  headers: React.ReactNode[];
  rows: React.ReactNode[][];
}

/*
MDX tables will pass data like:
{
  headers: ['Name', 'Role'],
  rows: [
    ['Alice', 'Engineer'],
    ['Bob', 'Designer']
  ]
}
*/

/**
 * Renders a semantic HTML table from the given data.
 *
 * @remarks
 * - The component expects a `TableData`-shaped object (commonly `{ headers: string[]; rows: string[][] }`).
 * - Headers are rendered inside <thead> and each row inside <tbody>.
 * - Array indices are used as React keys for headers, rows, and cells; consider providing stable keys if available.
 *
 * @param props.data - The table data containing an array of headers and an array of row arrays.
 * @returns A JSX element representing a table with a header row and body rows.
 *
 * @example
 * <Table data={{ headers: ['Name', 'Age'], rows: [['Alice', '30'], ['Bob', '25']] }} />
 */
function Table({ data }: { data: TableData }) {

  const headers = data.headers.map((header, index) => (
    <th key={index} className='px-4 py-3 font-semibold border-b border-gray-200'>{header}</th>
  ));

  const rows = data.rows.map((row, index) => (
    <tr key={index} className='hover:bg-gray-50 transition-colors'>
      {row.map((cell, cellIndex) => (
        <td key={cellIndex} className='px-4 py-3 text-gray-600'>{cell}</td>
      ))}
    </tr>
  ));

  return (
    <table className='my-8 mx-auto w-full border border-gray-200 rounded-lg overflow-hidden text-sm'>
      <thead className='px-4 py-3 font-semibold border-b border-gray-200'>
        <tr className='text-left text-gray-700'>{headers}</tr>
      </thead>
      <tbody className='divide-y divide-gray-100'>{rows}</tbody>
    </table>
  );

}

type CustomLinkProps = 
  React.ComponentProps<typeof Link> & 
  React.AnchorHTMLAttributes<HTMLAnchorElement>;

function CustomLink(props: CustomLinkProps) {
  const href = String(props.href);

  if (href.startsWith('/')) {
    return (
      <Link href={href} {...(props as any)}>{props.children}</Link>
    );
  }

  if (href.startsWith('#')) {
    return <a {...props} />;
  }

  return <a target="_blank" rel="noopener noreferrer" {...props} />;
}

function RoundedImage(props: React.ComponentProps<typeof Image>) {
  return <Image className="rounded-lg" {...props} />;
}

/**
 * Renders a highlighted inline code element.
 *
 * Converts the provided children to a string, passes it to a `highlight` function to produce
 * HTML, and injects that HTML into a <code> element via `dangerouslySetInnerHTML`.
 *
 * @remarks
 * - `children` is coerced to a string; if absent, an empty string is used.
 * - Additional props are spread onto the rendered <code> element and may include any standard
 *   HTML attributes (e.g., `className`, `title`, `aria-*`, `data-*`).
 * - Because this component uses `dangerouslySetInnerHTML`, ensure that the output of `highlight`
 *   is trusted or properly sanitized to avoid XSS vulnerabilities.
 *
 * @param children - The code content to highlight. May be any React node; it will be converted to string.
 * @param props - Extra HTML attributes forwarded to the <code> element.
 *
 * @returns A React element: a <code> node containing the highlighted HTML.
 *
 * @example
 * <Code className="inline-code">const x = 42;</Code>
 */
export function Code({ children, ...props }: { children?: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  const childStr = String(children ?? '');
  let codeHTML = highlight(childStr);
  return <code dangerouslySetInnerHTML={{ __html: codeHTML }} {...props} />;
}

function slugify(str: string) {
  return String(str)
    .toLowerCase()
    .trim() // Remove whitespace from both ends of a string
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word characters except for -
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
}

function createHeading(level: number) {
  const Heading: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    let slug = slugify(String(children ?? ''));
    const tag = `h${level}`;
    return React.createElement(
      tag as any,
      { id: slug },
      React.createElement('a', {
        href: `#${slug}`,
        key: `link-${slug}`,
        className: 'anchor',
      }),
      children
    );
  };

  Heading.displayName = `Heading${level}`;

  return Heading;
}

let components = {
  h1: createHeading(1),
  h2: createHeading(2),
  h3: createHeading(3),
  h4: createHeading(4),
  h5: createHeading(5),
  h6: createHeading(6),
  RemoveElementVisualizer: RemoveElementVisualizer,
  TwoPointerVisualizer: TwoPointerVisualizer,
  MajorityElementFrequencyMapVisualizer: MajorityElementFrequencyMapVisualizer,
  MajorityElementSortingVisualizer: MajorityElementSortingVisualizer,
  FindDuplicateFloydVisualizer: FindDuplicateFloydVisualizer,
  DetectCycleVisitedSetVisualizer: DetectCycleVisitedSetVisualizer,
  StripCollisionVisualizer: StripCollisionVisualizer,
  Image: RoundedImage,
  a: CustomLink,
  code: Code,
  Table,
  table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
    <table
      className="my-8 mx-auto w-full border border-collapse border-gray-200 rounded-lg overflow-hidden text-sm"
      {...props}
    />
  ),
  thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-neutral-50 dark:bg-neutral-900/40" {...props} />
  ),
  tbody: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody className='divide-y divide-gray-100' {...props} />
  ),
  tr: (props: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="hover:bg-gray-50 transition-colors" {...props} />
  ),
  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th
      className="px-4 py-3 font-semibold border-b border-gray-200 text-neutral-900 dark:text-neutral-100"
      {...props}
    />
  ),
  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td
      className="px-3 py-2 align-top text-neutral-700 dark:text-neutral-300"
      {...props}
    />
  ),
};

export function CustomMDX(props: React.ComponentProps<typeof MDXRemote>) {
  return (
    <MDXRemote
      {...props}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm],
        },
      }}
      components={{ ...components, ...(props.components || {}) }}
    />
  );
}