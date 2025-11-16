# Vocabulary Comparison Tool

`tools/compare_vocab.py` compares any TSV of Spanish vocabulary against your canonical `data/words.tsv` to surface rows that are missing from your list.

## Key Behavior

- **Inputs**: Both files must be TSV and UTF‑8 encoded. Only column 0 (Spanish word) is considered.
- **Normalization**: Trims whitespace, strips leading/trailing punctuation (unless `--keep-punctuation`), lowercases, and optionally removes accents (`--ignore-accents`).
- **Duplicates & malformed rows**: Duplicates in each input are counted and ignored by default (use `--keep-duplicates` to keep them). Blank/malformed rows are skipped but reported.
- **Output**: Every row from the “other” file whose Spanish word is missing in `--mine` is written to an output TSV (header preserved). A summary is printed to stdout.

## CLI Reference

```bash
python tools/compare_vocab.py --other path/to/new_list.tsv \
    [--mine data/words.tsv] \
    [--output data/missing-from-new.tsv] \
    [--ignore-accents] \
    [--keep-punctuation] \
    [--keep-duplicates] \
    [--no-summary]
```

| Flag | Description |
| --- | --- |
| `--mine` | Canonical TSV (defaults to `data/words.tsv`). |
| `--other` | TSV to compare; required. |
| `--output` | Explicit path for missing rows TSV. Otherwise auto-generated under `data/`. |
| `--ignore-accents` | Treat accented/unaccented forms as equal. |
| `--keep-punctuation` | Disables punctuation stripping. |
| `--keep-duplicates` | Retains duplicate rows from `--other`. |
| `--no-summary` | Suppresses the summary block on stdout. |

## Typical Workflow

1. Place the new vocabulary TSV anywhere (e.g., `data/new_source.tsv`).
2. Run `python tools/compare_vocab.py --other data/new_source.tsv`.
3. Inspect the summary to see counts of unique words, duplicates, malformed lines, and how many rows were saved.
4. Open the generated TSV (path shown in summary) to review the missing entries.
