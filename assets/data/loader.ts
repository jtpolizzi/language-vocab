// assets/data/loader.ts

type LoaderEventName = 'loading' | 'loaded' | 'error';
interface LoaderDetail {
  url: string;
  text?: string;
  error?: Error;
}

const LOADER = {
  status: 'idle' as LoaderEventName | 'idle',
  listeners: new Map<LoaderEventName, Set<(detail: LoaderDetail) => void>>(),
  lastDetail: null as (LoaderDetail & { event: LoaderEventName; at: number }) | null
};

function emit(eventName: LoaderEventName, detail: LoaderDetail) {
  LOADER.lastDetail = { ...detail, event: eventName, at: Date.now() };
  const handlers = LOADER.listeners.get(eventName);
  if (!handlers) return;
  handlers.forEach((fn) => fn(detail));
}

export function onDataEvent(eventName: LoaderEventName, handler: (detail: LoaderDetail) => void) {
  if (!LOADER.listeners.has(eventName)) {
    LOADER.listeners.set(eventName, new Set());
  }
  const set = LOADER.listeners.get(eventName)!;
  set.add(handler);
  return () => {
    set.delete(handler);
    if (!set.size) LOADER.listeners.delete(eventName);
  };
}

export async function loadWords({ url = 'data/words.tsv' } = {}): Promise<string> {
  LOADER.status = 'loading';
  emit('loading', { url });
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load TSV (${res.status})`);
    const text = await res.text();
    LOADER.status = 'loaded';
    emit('loaded', { url, text });
    return text;
  } catch (error) {
    LOADER.status = 'error';
    emit('error', { url, error: error as Error });
    throw error;
  }
}

export function getLoaderStatus() {
  return {
    status: LOADER.status,
    lastEvent: LOADER.lastDetail
  };
}
