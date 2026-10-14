'use client';

import { History, Trash2 } from 'lucide-react';

export interface RecentDownload {
  id: string;
  fileName: string;
  format: string;
  completedAt: string;
}

export function RecentDownloads({
  items,
  onClear,
}: {
  items: RecentDownload[];
  onClear: () => void;
}) {
  if (!items.length) return null;

  return (
    <section className="w-full max-w-2xl px-3 sm:px-6" aria-labelledby="recent-downloads-title">
      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="recent-downloads-title" className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            <History className="h-4 w-4" aria-hidden="true" />
            Recent downloads
          </h2>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Clear history
          </button>
        </div>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex min-w-0 items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate font-medium text-zinc-700 dark:text-zinc-300">{item.fileName}</span>
              <span className="shrink-0 text-zinc-500 dark:text-zinc-400">{item.format} · {item.completedAt}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
          This list stays in this page&apos;s memory and clears when you refresh or close the page.
        </p>
      </div>
    </section>
  );
}
