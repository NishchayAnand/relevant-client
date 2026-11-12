'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const post = document.getElementById('post-top');
      const top = post ? post.getBoundingClientRect().top : -window.scrollY;
      setVisible(top < 0);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => {
        const post = document.getElementById('post-top');
        const top = post ? post.getBoundingClientRect().top + window.scrollY : 0;
        window.scrollTo({ top, behavior: 'auto' });
      }}
      className={
        'fixed right-10 bottom-10 z-20 flex size-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 transition-opacity hover:bg-neutral-50 ' +
        (visible ? 'opacity-100' : 'pointer-events-none opacity-0')
      }
    >
      <ArrowUp size={18} />
    </button>
  );
}
