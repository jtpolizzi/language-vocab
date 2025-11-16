#!/usr/bin/env python3
"""Compare Spanish vocab TSV files and report missing entries."""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import re
import string
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple


DEFAULT_DATA_DIR = Path("data")
STRIP_CHARS = string.whitespace + string.punctuation


@dataclass
class LoadStats:
    rows_read: int = 0
    header_skipped: bool = False
    malformed_rows: int = 0
    duplicates: int = 0
    unique_words: int = 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Compare a TSV file containing Spanish vocabulary against your "
            "canonical words.tsv and list the rows that are missing."
        )
    )
    parser.add_argument(
        "--mine",
        type=Path,
        default=Path("data") / "words.tsv",
        help="Path to the TSV file treated as canonical (default: data/words.tsv).",
    )
    parser.add_argument(
        "--other",
        type=Path,
        required=True,
        help="Path to the TSV file whose words should exist in --mine.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help=(
            "Optional path for the TSV containing missing rows. "
            "Defaults to data/missing-from-<other>-<timestamp>.tsv."
        ),
    )
    parser.add_argument(
        "--ignore-accents",
        action="store_true",
        help="Treat accented and unaccented characters as the same (default: exact match).",
    )
    parser.add_argument(
        "--keep-punctuation",
        dest="strip_punct",
        action="store_false",
        help="Disable stripping punctuation from both ends of words before comparison.",
    )
    parser.add_argument(
        "--keep-duplicates",
        action="store_true",
        help="Keep duplicate words from the other file instead of collapsing to the first occurrence.",
    )
    parser.add_argument(
        "--no-summary",
        dest="summary",
        action="store_false",
        help="Disable printing the summary block (default: summary is shown).",
    )
    parser.set_defaults(strip_punct=True, summary=True)
    return parser.parse_args()


def sanitize_word(
    word: str, *, ignore_accents: bool, strip_punct: bool
) -> str:
    text = word.strip()
    if strip_punct:
        text = text.strip(STRIP_CHARS)
    text = text.lower()
    if ignore_accents:
        text = "".join(
            ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn"
        )
    return text


def load_word_set(
    path: Path, *, ignore_accents: bool, strip_punct: bool
) -> Tuple[set[str], LoadStats]:
    stats = LoadStats()
    words: set[str] = set()

    try:
        with path.open("r", encoding="utf-8", newline="") as handle:
            reader = csv.reader(handle, dialect="excel-tab")
            for idx, row in enumerate(reader):
                stats.rows_read += 1
                if idx == 0:
                    stats.header_skipped = True
                    continue
                if not row or not row[0].strip():
                    stats.malformed_rows += 1
                    continue
                normalized = sanitize_word(
                    row[0], ignore_accents=ignore_accents, strip_punct=strip_punct
                )
                if not normalized:
                    stats.malformed_rows += 1
                    continue
                if normalized in words:
                    stats.duplicates += 1
                    continue
                words.add(normalized)
    except FileNotFoundError:
        sys.exit(f"File not found: {path}")

    stats.unique_words = len(words)
    return words, stats


@dataclass
class OtherFileData:
    rows: List[Tuple[str, Sequence[str]]]
    header: Sequence[str]
    stats: LoadStats


def load_other_file(
    path: Path,
    *,
    ignore_accents: bool,
    strip_punct: bool,
    keep_duplicates: bool,
) -> OtherFileData:
    stats = LoadStats()
    rows: List[Tuple[str, Sequence[str]]] = []
    seen: set[str] = set()
    header: Sequence[str] = []

    try:
        with path.open("r", encoding="utf-8", newline="") as handle:
            reader = csv.reader(handle, dialect="excel-tab")
            for idx, row in enumerate(reader):
                stats.rows_read += 1
                if idx == 0:
                    header = row
                    stats.header_skipped = True
                    continue
                if not row or not row[0].strip():
                    stats.malformed_rows += 1
                    continue
                normalized = sanitize_word(
                    row[0], ignore_accents=ignore_accents, strip_punct=strip_punct
                )
                if not normalized:
                    stats.malformed_rows += 1
                    continue

                if normalized in seen:
                    stats.duplicates += 1
                    if not keep_duplicates:
                        continue
                else:
                    seen.add(normalized)

                rows.append((normalized, row))
    except FileNotFoundError:
        sys.exit(f"File not found: {path}")

    stats.unique_words = len(seen)
    return OtherFileData(rows=rows, header=header, stats=stats)


def ensure_output_path(path: Path | None, other: Path) -> Path:
    if path is not None:
        target = path
    else:
        DEFAULT_DATA_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
        safe_other = re.sub(r"[^A-Za-z0-9._-]+", "-", other.stem).strip("-") or "other"
        target = DEFAULT_DATA_DIR / f"missing-from-{safe_other}-{timestamp}.tsv"
    target.parent.mkdir(parents=True, exist_ok=True)
    return target


def write_rows(
    target: Path,
    header: Sequence[str],
    rows: Iterable[Sequence[str]],
) -> None:
    with target.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, dialect="excel-tab")
        if header:
            writer.writerow(header)
        for row in rows:
            writer.writerow(row)


def main() -> None:
    args = parse_args()

    mine_words, mine_stats = load_word_set(
        args.mine, ignore_accents=args.ignore_accents, strip_punct=args.strip_punct
    )

    other_data = load_other_file(
        args.other,
        ignore_accents=args.ignore_accents,
        strip_punct=args.strip_punct,
        keep_duplicates=args.keep_duplicates,
    )

    missing_rows = [
        row for normalized, row in other_data.rows if normalized not in mine_words
    ]

    target_path = ensure_output_path(args.output, args.other)
    write_rows(target_path, other_data.header, missing_rows)

    if args.summary:
        print("Comparison summary")
        print("------------------")
        print(f"Mine file:        {args.mine}")
        print(f"  Rows read:      {mine_stats.rows_read} (header skipped: {mine_stats.header_skipped})")
        print(f"  Unique words:   {mine_stats.unique_words}")
        print(f"  Duplicates:     {mine_stats.duplicates}")
        print(f"  Malformed rows: {mine_stats.malformed_rows}")
        print()
        print(f"Other file:       {args.other}")
        print(f"  Rows read:      {other_data.stats.rows_read} (header skipped: {other_data.stats.header_skipped})")
        print(f"  Unique words:   {other_data.stats.unique_words}")
        print(f"  Duplicates:     {other_data.stats.duplicates}")
        print(f"  Malformed rows: {other_data.stats.malformed_rows}")
        print()
        print(f"Missing rows written: {len(missing_rows)}")
        print(f"Output file:          {target_path}")


if __name__ == "__main__":
    main()
