# Enrich Missing Vocab Tool

`tools/enrich_missing_vocab.py` converts the “missing rows” TSV exported by `compare_vocab.py` into the full `words.tsv` schema (`word`, `definition`, `pos`, `cefr`, `tags`).

## How It Works

- Scans every TSV under `data/` and `Vocab List Work Files/` (plus any files passed via `--reference`) to find existing CEFR/POS/tag entries for each Spanish word.
- Normalizes part-of-speech values to the abbreviations used in `words.tsv`. A cached Kaikki/Wiktionary dump (`C:\\Users\\jtpol\\OneDrive\\Temp\\es-extract.jsonl.gz` by default) is consulted first, and only if a word is missing there do heuristics (English gloss, word endings, etc.) kick in.
- CEFR is reused from the reference lists when available; otherwise it is estimated from word frequency. The script keeps a HermitDave frequency file outside the repo (`C:\\Users\\jtpol\\OneDrive\\Temp\\es_full_frequency.txt` by default) and auto-downloads it when missing.
- Tags default to blank unless the reference data already contains them.
- Output keeps the canonical column order and is ready to merge into `data/words.tsv` after review.
- When `--include-suggestions` is passed, two extra columns (`pos_suggested`, `cefr_suggested`) capture the raw lookup results (Kaikki/Wiktionary for POS, HermitDave for CEFR) so you can compare them against the final values pulled from your own lists.

## Decision Rules

### Part of Speech

1. **Existing data wins** – if any reference TSV already lists a POS for the word, that canonical value is used.
2. **Kaikki/Wiktionary lookup** – otherwise the script checks the cached `es-extract.jsonl.gz` dump. It normalizes the lemma (with and without accents) and chooses the most common POS Wiktionary reports for that spelling.
3. **Source file hint** – if the “other” TSV provided a POS column (e.g., `adjective`, `verb`), that string is mapped through the same abbreviation table used in `words.tsv`.
4. **Heuristics (only as a last resort)**:
   - English definition starts with `to …` → `verb`
   - Word ends with `-mente` → `adv`
   - Word ends with `-ción`, `-sión`, `-dad`, `-tad`, `-aje`, `-umbre`, or `-ez` → `noun`
   - Word ends with infinitive suffixes `-ar`, `-er`, `-ir` → `verb`
   - Otherwise the POS remains blank for manual review.

### CEFR Level

1. **Reference TSVs** – if any of the scanned TSVs already assign a CEFR level to the word, that value is reused verbatim.
2. **Frequency-based estimate** – for all other words, the HermitDave frequency list (ranked by usage in Spanish) is consulted:
   - rank ≤ 500 → `A1.1`
   - 501–1500 → `A1.2`
   - 1501–3000 → `A2.1`
   - 3001–6000 → `A2.2`
   - 6001–10000 → `B1.1`
   - 10001–15000 → `B1.2`
   - 15001–22000 → `B2.1`
   - > 22000 or missing → `B2.2`
3. If the frequency file is missing/unreadable or the word never appears there, the inferred level is set to `X` so you can quickly identify gaps.

## CLI Reference

```bash
python tools/enrich_missing_vocab.py --input data/missing-from-foo.tsv \
    [--output data/missing-from-foo-enriched.tsv] \
    [--reference path/to/extra.tsv ...] \
    [--frequency C:\\Users\\you\\OneDrive\\Temp\\frequency.txt] \
    [--pos-source C:\\Users\\you\\OneDrive\\Temp\\es-extract.jsonl.gz] \
    [--include-suggestions]
```

| Flag | Description |
| --- | --- |
| `--input` | TSV created by `compare_vocab.py`; must contain `word`, `definition`, `pos` columns. |
| `--output` | Destination TSV (defaults to `<input>-enriched.tsv` in `data/`). |
| `--reference` | Extra TSVs to scan for CEFR/POS/tags (repeatable). |
| `--frequency` | Location of the Spanish frequency list; auto-downloaded from HermitDave if absent. |
| `--pos-source` | Location of the Kaikki/Wiktionary POS dump; downloaded automatically if missing. |
| `--include-suggestions` | Adds `pos_suggested`/`cefr_suggested` columns populated from the external lookups. |

## Typical Workflow

1. Run `compare_vocab.py` to create `data/missing-from-...tsv`.
2. Run `python tools/enrich_missing_vocab.py --input data/missing-from-...tsv`.
3. Review the enriched TSV for any CEFR/POS corrections.
4. Append or merge the rows into `data/words.tsv` as needed.
