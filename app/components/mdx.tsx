import Link from 'next/link'
import Image from 'next/image'
import { MDXRemote } from 'next-mdx-remote/rsc';
import { highlight } from 'sugar-high';
import React from 'react';

interface TableData {
  headers: React.ReactNode[]
  rows: React.ReactNode[][]
}

function Table({ data }: { data: TableData }) {
  const headers = data.headers.map((header, index) => (
    <th key={index}>{header}</th>
  ))
  const rows = data.rows.map((row, index) => (
    <tr key={index}>
      {row.map((cell, cellIndex) => (
        <td key={cellIndex}>{cell}</td>
      ))}
    </tr>
  ))

  return (
    <table>
      <thead>
        <tr>{headers}</tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  )
}

type CustomLinkProps = React.ComponentProps<typeof Link> & React.AnchorHTMLAttributes<HTMLAnchorElement>

function CustomLink(props: CustomLinkProps) {
  const href = String(props.href)

  if (href.startsWith('/')) {
    return (
      <Link href={href} {...(props as any)}>
        {props.children}
      </Link>
    )
  }

  if (href.startsWith('#')) {
    return <a {...props} />
  }

  return <a target="_blank" rel="noopener noreferrer" {...props} />
}

function RoundedImage(props: React.ComponentProps<typeof Image>) {
  return <Image className="rounded-lg" {...props} />
}

function Code({ children, ...props }: { children?: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  const childStr = String(children ?? '')
  let codeHTML = highlight(childStr)
  return <code dangerouslySetInnerHTML={{ __html: codeHTML }} {...props} />
}

function slugify(str: unknown) {
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
    let slug = slugify(String(children ?? ''))
    const tag = `h${level}`
    return React.createElement(
      tag as any,
      { id: slug },
      React.createElement('a', {
        href: `#${slug}`,
        key: `link-${slug}`,
        className: 'anchor',
      }),
      children
    )
  }

  Heading.displayName = `Heading${level}`

  return Heading
}

let components = {
  h1: createHeading(1),
  h2: createHeading(2),
  h3: createHeading(3),
  h4: createHeading(4),
  h5: createHeading(5),
  h6: createHeading(6),
  Image: RoundedImage,
  a: CustomLink,
  code: Code,
  Table,
}

export function CustomMDX(props: React.ComponentProps<typeof MDXRemote>) {
  return (
    <MDXRemote
      {...props}
      components={{ ...components, ...(props.components || {}) }}
    />
  )
}