
import fs from 'fs';
import path from 'path';

export type Metadata = {
    title: string,
    publishedAt: string,
    summary: string,
    image?: string,
    tags?: string[]
};

function parseTags(value: string): string[] {
  const unwrapped = value.replace(/^\[(.*)\]$/, '$1');
  return unwrapped
    .split(',')
    .map((tag) => tag.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function parseFrontmatter(fileContent: string) {
  let frontmatterRegex = /---\s*([\s\S]*?)\s*---/;
  let match = frontmatterRegex.exec(fileContent);
  if (!match) {
    return { metadata: {} as Metadata, content: fileContent.trim() };
  }
  let frontMatterBlock = match[1];
  let content = fileContent.replace(frontmatterRegex, '').trim();
  let frontMatterLines = frontMatterBlock.trim().split('\n');
  let metadata: Partial<Metadata> = {};

  frontMatterLines.forEach((line) => {
    let [key, ...valueArr] = line.split(': ');
    const field = key.trim();
    let value = valueArr.join(': ').trim();
    value = value.replace(/^['"](.*)['"]$/, '$1'); // Remove quotes

    if (field === 'tags') {
      const tags = parseTags(value);
      if (tags.length > 0) {
        metadata.tags = tags;
      }
    } else if (
      field === 'title' ||
      field === 'publishedAt' ||
      field === 'summary' ||
      field === 'image'
    ) {
      metadata[field] = value;
    }
  })

  return { metadata: metadata as Metadata, content };
}

function readMDXFile(filepath: string) {
    let rawContent = fs.readFileSync(filepath, 'utf-8');
    return parseFrontmatter(rawContent);
}

function getMDXFiles(dir: string) {
    return fs.readdirSync(dir).filter((file) => path.extname(file) === '.mdx');
}

function getMDXData(dir: string) {
    let mdxFiles = getMDXFiles(dir);
    return mdxFiles.map((file) => {
        let { metadata, content } = readMDXFile(path.join(dir, file));
        let slug = path.basename(file, path.extname(file));

        return {
            metadata,
            slug,
            content
        };
    });
}

export function getBlogPosts() {
    return getMDXData(path.join(process.cwd(), 'app', 'blog', 'posts'));
}

const ADDITIONAL_POSTS_DIR = path.join(process.cwd(), 'app', 'additional-blog', 'posts');

function titleFromSlug(slug: string) {
    return slug
        .split('-')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function getAdditionalBlogSlugs() {
    if (!fs.existsSync(ADDITIONAL_POSTS_DIR)) return [];
    return getMDXFiles(ADDITIONAL_POSTS_DIR).map((file) => path.basename(file, path.extname(file)));
}

function readAdditionalPost(slug: string) {
    const filePath = path.join(ADDITIONAL_POSTS_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) return null;

    const { metadata, content } = readMDXFile(filePath);
    return {
        metadata: {
            ...metadata,
            title: metadata.title || titleFromSlug(slug),
            publishedAt: metadata.publishedAt || '',
            summary: metadata.summary || '',
        },
        slug,
        content,
    };
}

export function getAdditionalBlogPosts() {
    return getAdditionalBlogSlugs()
        .map((slug) => readAdditionalPost(slug))
        .filter((post) => post !== null);
}

export function getBlogPost(slug: string) {
    if (!/^[A-Za-z0-9-]+$/.test(slug)) return null;
    return getBlogPosts().find((post) => post.slug === slug) ?? null;
}

export function getAdditionalBlogPost(slug: string) {
    if (!/^[A-Za-z0-9-]+$/.test(slug)) return null;
    return readAdditionalPost(slug);
}

export function formatDate(date: string, includeRelative: false) {
    let currentDate = new Date();
    if(!date.includes('T')) {
        date = `${date}T00:00:00`;
    }
    let targetDate = new Date(date);

    let yearsAgo = currentDate.getFullYear() - targetDate.getFullYear();
    let monthsAgo = currentDate.getMonth() - targetDate.getMonth();
    let daysAgo = currentDate.getDate() - targetDate.getDate();

    let formattedDate = '';

    if (yearsAgo > 0) {
        formattedDate = `${yearsAgo}y ago`;
    } else if (monthsAgo > 0) {
        formattedDate = `${monthsAgo}mo ago`;
    } else if (daysAgo > 0) {
        formattedDate = `${daysAgo}d ago`;
    } else {
        formattedDate = 'Today';
    }

    let fullDate = targetDate.toLocaleDateString('en-us', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    if(!includeRelative) {
        return fullDate;
    }

    return `${fullDate} (${formattedDate})`;
}