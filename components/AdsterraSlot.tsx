'use client';

import Script from 'next/script';

interface AdsterraSlotProps {
  label?: string;
}

/** Loads an approved Adsterra native-banner script only when its account values are configured. */
export function AdsterraSlot({ label = 'Advertisement' }: AdsterraSlotProps) {
  const scriptUrl = process.env.NEXT_PUBLIC_ADSTERRA_SCRIPT_URL;
  const containerId = process.env.NEXT_PUBLIC_ADSTERRA_CONTAINER_ID;

  if (!scriptUrl || !containerId || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(containerId)) {
    return null;
  }

  let safeScriptUrl: URL;
  try {
    safeScriptUrl = new URL(scriptUrl.startsWith('//') ? `https:${scriptUrl}` : scriptUrl);
  } catch {
    return null;
  }
  if (safeScriptUrl.protocol !== 'https:') return null;

  return (
    <aside className="w-full max-w-2xl px-3 sm:px-6" aria-label={label}>
      <div className="min-h-0 overflow-hidden rounded-xl text-center">
        <span className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <div id={containerId} className="mx-auto min-h-0" />
      </div>
      <Script
        src={safeScriptUrl.toString()}
        strategy="lazyOnload"
        data-cfasync="false"
      />
    </aside>
  );
}
