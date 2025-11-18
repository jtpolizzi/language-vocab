// src/state/data.ts

const WORD_FIELDS = ['word', 'term', 'lemma'] as const;
const LEGACY_WORD_FIELDS = ['Spanish', 'es'] as const; // TODO: remove once all data files use word/definition.
const DEFINITION_FIELDS = ['definition', 'gloss', 'meaning'] as const;
const LEGACY_DEFINITION_FIELDS = ['English', 'en'] as const; // TODO: remove once all data files use word/definition.

export interface RawWord {
  [key: string]: unknown;
  word?: string;
  term?: string;
  lemma?: string;
  Spanish?: string;
  es?: string;
  definition?: string;
  gloss?: string;
  meaning?: string;
  English?: string;
  en?: string;
  POS?: string;
  pos?: string;
  CEFR?: string;
  cefr?: string;
  Tags?: string;
  tags?: string;
}

export interface VocabEntry {
  id: string;
  termKey: string;
  word: string;
  definition: string;
  pos: string;
  cefr: string;
  tags: string;
}

function pickField(entry: RawWord, keys: readonly string[]): string {
  for (const key of keys) {
    const value = entry?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function normalizeTermPart(value: unknown, fallback: string): string {
  const norm = String(value ?? '').trim().toLowerCase();
  return norm || fallback;
}

export function termKey(word: unknown, pos: unknown): string {
  const baseWord = normalizeTermPart(word, 'unknown');
  const basePos = normalizeTermPart(pos, 'unknown');
  return `${baseWord}|${basePos}`;
}

export function stableId(word: string, definition: string): string {
  const s = `${word || ''}|${definition || ''}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `w_${(h >>> 0).toString(16)}`;
}

export function mapRaw(raw: RawWord[] = []): VocabEntry[] {
  return raw.map((entry) => {
    const word = pickField(entry, [...WORD_FIELDS, ...LEGACY_WORD_FIELDS]);
    const definition = pickField(entry, [...DEFINITION_FIELDS, ...LEGACY_DEFINITION_FIELDS]);
    const pos = (entry.POS || entry.pos || '').trim();
    const cefr = (entry.CEFR || entry.cefr || '').trim();
    const tags = (entry.Tags || entry.tags || '').trim();
    return {
      id: stableId(word, definition),
      termKey: termKey(word, pos),
      word,
      definition,
      pos,
      cefr,
      tags
    };
  });
}

export function normalizeTagsList(source: unknown): string[] {
  if (!source) return [];
  return String(source)
    .split(/[|,;]+|\s+/g)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}
