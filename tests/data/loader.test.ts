import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadWords, onDataEvent } from '../../assets/data/loader.ts';

describe('data/loader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('emits loading and loaded events', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('word\tdefinition\nhola\thello')
    });
    const events = [];
    const offLoading = onDataEvent('loading', (detail) => events.push(['loading', detail]));
    const offLoaded = onDataEvent('loaded', (detail) => events.push(['loaded', detail]));
    await loadWords({ url: '/mock.tsv' });
    offLoading();
    offLoaded();
    expect(fetch).toHaveBeenCalled();
    expect(events[0][0]).toBe('loading');
    expect(events[1][0]).toBe('loaded');
    expect(events[1][1].text).toContain('hola');
  });

  it('emits error when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const events = [];
    const offError = onDataEvent('error', (detail) => events.push(detail));
    await expect(loadWords({ url: '/missing.tsv' })).rejects.toThrow();
    offError();
    expect(events).toHaveLength(1);
    expect(events[0].error).toBeInstanceOf(Error);
  });
});
