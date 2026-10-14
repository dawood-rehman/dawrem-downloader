import Link from 'next/link';
import type { ReactNode } from 'react';

export function StaticInfoPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#e9eef5] px-4 py-10 text-zinc-800 dark:bg-[#090d16] dark:text-zinc-100 sm:px-6">
      <article className="mx-auto max-w-3xl rounded-3xl border border-white/60 bg-[#f4f7fb] p-6 shadow-xl dark:border-white/5 dark:bg-[#121826] sm:p-10">
        <Link href="/" className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">← DAWREM Downloader</Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">{title}</h1>
        <div className="prose prose-zinc mt-6 max-w-none space-y-5 text-sm leading-7 dark:prose-invert">
          {children}
        </div>
      </article>
    </main>
  );
}
