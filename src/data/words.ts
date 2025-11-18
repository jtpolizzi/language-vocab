import { loadWords } from './loader.ts';
import { hydrateWords, setLoaderStatus, type LoaderStatus } from '../state';
import type { RawWord } from '../state/data.ts';

export interface WordLoaderUpdate {
  status: LoaderStatus;
  message: string;
  total: number;
}

export interface StartWordsLoaderOptions {
  url: string;
  onUpdate?: (update: WordLoaderUpdate) => void;
}

const DEFAULT_MESSAGES: Record<LoaderStatus, string> = {
  idle: 'Idle',
  loading: 'Loading words...',
  loaded: 'Loaded words.',
  error: 'Failed to load words. Check console for details.'
};

export async function startWordsLoader({ url, onUpdate }: StartWordsLoaderOptions): Promise<void> {
  const notify = (status: LoaderStatus, total = 0, message = DEFAULT_MESSAGES[status]) => {
    onUpdate?.({ status, message, total });
  };

  setLoaderStatus('loading');
  notify('loading');

  try {
    const text = await loadWords({ url });
    const raw = parseTSV(text);
    setLoaderStatus('loaded');
    hydrateWords(raw, {
      source: 'tsv',
      loadedAt: Date.now(),
      loaderStatus: 'loaded'
    });
    notify('loaded', raw.length, `Loaded ${raw.length} words.`);
  } catch (error) {
    console.error('Failed to load words', error);
    setLoaderStatus('error');
    hydrateWords([], {
      source: 'none',
      loadedAt: Date.now(),
      loaderStatus: 'error'
    });
    notify('error', 0, DEFAULT_MESSAGES.error);
  }
}

function parseTSV(text: string): RawWord[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split('\t').map((h) => h.trim());
  const idx = {
    word: headers.findIndex((h) => /^(word|spanish)$/i.test(h)),
    definition: headers.findIndex((h) => /^(definition|english)$/i.test(h)),
    POS: headers.findIndex((h) => /^pos$/i.test(h)),
    CEFR: headers.findIndex((h) => /^cefr$/i.test(h)),
    Tags: headers.findIndex((h) => /^tags?$/i.test(h))
  };
  const out: RawWord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.every((c) => !c || !c.trim())) continue;
    out.push({
      word: (idx.word >= 0 ? cols[idx.word] : '').trim(),
      definition: (idx.definition >= 0 ? cols[idx.definition] : '').trim(),
      POS: (idx.POS >= 0 ? cols[idx.POS] : '').trim(),
      CEFR: (idx.CEFR >= 0 ? cols[idx.CEFR] : '').trim(),
      Tags: (idx.Tags >= 0 ? cols[idx.Tags] : '').trim()
    });
  }
  return out;
}
