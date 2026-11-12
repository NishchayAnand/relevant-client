export type TocHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/&/g, '-and-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

export function uniqueSlug(base: string, seen: Map<string, number>) {
  const slug = base || 'section';
  const count = seen.get(slug) ?? 0;
  seen.set(slug, count + 1);
  return count === 0 ? slug : `${slug}-${count + 1}`;
}

function stripInlineMarkdown(text: string) {
  return text
    .replace(/\s+#+\s*$/, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

type MdNode = {
  type: string;
  value?: string;
  alt?: string;
  children?: MdNode[];
  data?: { hProperties?: Record<string, string> };
};

function nodeText(node: MdNode): string {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? '';
  if (node.type === 'image' || node.type === 'imageReference') return node.alt ?? '';
  if (!node.children) return '';
  return node.children.map(nodeText).join('');
}

/** Assigns the same ids `getToc` links to, once per MDX compile. */
export function remarkHeadingIds() {
  return (tree: MdNode) => {
    const seen = new Map<string, number>();
    const walk = (node: MdNode) => {
      if (node.type === 'heading') {
        const id = uniqueSlug(slugify(nodeText(node)), seen);
        node.data = {
          ...node.data,
          hProperties: { ...node.data?.hProperties, id },
        };
        return;
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}

/**
 * Section list for the left margin. H2 and H3 are the post sections.
 * Every heading level is still walked so duplicate slugs match the ids
 * rendered on the headings themselves.
 */
export function getToc(content: string): TocHeading[] {
  const source = content.replace(/\r\n/g, '\n').replace(/```[\s\S]*?```/g, '');
  const seen = new Map<string, number>();
  const toc: TocHeading[] = [];
  const regex = /^[ ]{0,3}(#{1,6})[ \t]+(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(source)) !== null) {
    const text = stripInlineMarkdown(match[2]);
    const id = uniqueSlug(slugify(text), seen);
    const level = match[1].length;
    if ((level === 2 || level === 3) && text) {
      toc.push({ id, text, level });
    }
  }

  return toc;
}
