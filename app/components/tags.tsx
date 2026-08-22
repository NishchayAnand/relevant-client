import { cn } from '@/lib/utils';

export function Tags({
  tags,
  className,
  size = 'default',
}: {
  tags?: string[];
  className?: string;
  size?: 'default' | 'sm';
}) {
  if (!tags?.length) {
    return null;
  }

  return (
    <div className={cn('inline-flex flex-wrap items-center gap-2', className)}>
      {tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            'inline-flex items-center rounded-full bg-emerald-700 text-white font-medium',
            size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
          )}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
