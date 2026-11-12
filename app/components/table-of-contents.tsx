'use client';

import { useEffect, useRef, useState } from 'react';
import type { TocHeading } from '@/app/blog/toc';

export function TableOfContents({ headings }: { headings: TocHeading[] }) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? '');
  const navRef = useRef<HTMLElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const nested = headings.some((heading) => heading.level === 2);

  useEffect(() => {
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    const update = () => {
      const marker = 120;
      let current = elements[0].id;
      for (const element of elements) {
        if (element.getBoundingClientRect().top <= marker) {
          current = element.id;
        } else {
          break;
        }
      }
      setActiveId(current);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [headings]);

  useEffect(() => {
    const nav = navRef.current;
    const active = activeRef.current;
    if (!nav || !active) return;

    const navRect = nav.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    if (activeRect.top < navRect.top || activeRect.bottom > navRect.bottom) {
      nav.scrollTop += activeRect.top - navRect.top - nav.clientHeight / 3;
    }
  }, [activeId]);

  if (headings.length === 0) return null;

  return (
    <aside className="hidden min-[1360px]:block">
      <div
        className="fixed top-0 z-10 flex h-dvh w-[11rem] items-center"
        style={{ left: 'calc((100vw - 56rem) / 2 - 13.25rem)' }}
      >
        <nav
          ref={navRef}
          aria-label="Contents"
          className="max-h-[70dvh] w-full overflow-y-auto border-l border-neutral-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {headings.map((heading) => {
            const active = heading.id === activeId;
            return (
              <a
                key={heading.id}
                ref={active ? activeRef : undefined}
                href={`#${heading.id}`}
                aria-current={active ? 'location' : undefined}
                onClick={(event) => {
                  const target = document.getElementById(heading.id);
                  if (!target) return;
                  event.preventDefault();
                  target.scrollIntoView({ behavior: 'auto', block: 'start' });
                  history.replaceState(null, '', `#${heading.id}`);
                  setActiveId(heading.id);
                }}
                className={
                  'relative block py-2 pr-4 text-xs leading-snug no-underline transition-colors ' +
                  (nested && heading.level === 3 ? 'pl-6 ' : 'pl-3 ') +
                  (active
                    ? 'font-medium text-neutral-950'
                    : 'font-normal text-neutral-500 hover:text-neutral-800')
                }
              >
                {active ? (
                  <span className="absolute -left-px top-0 h-full w-0.5 bg-neutral-950" />
                ) : null}
                {heading.text}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
