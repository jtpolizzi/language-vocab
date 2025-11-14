# TSV ➜ XLSX Helper

`tools/tsv_to_xlsx.py` converts any tab-delimited file into an Excel workbook, with support for appending multiple worksheets to the same `.xlsx`.

## Features

- Works without third-party libraries; builds the minimal OpenXML parts with Python’s stdlib.
- Accepts either a brand-new workbook path or an existing `.xlsx`.
- Automatically sanitizes worksheet names (removes invalid characters, trims to 31 chars).
- Refuses to overwrite an existing sheet so you don’t accidentally replace data.

## Usage

```bash
# Basic: create words.xlsx (sheet name derived from TSV filename)
python tools/tsv_to_xlsx.py data/words.tsv

# Custom workbook/sheet
python tools/tsv_to_xlsx.py data/missing.tsv \
    --xlsx data/review.xlsx \
    --sheet MissingWords
```

- `--xlsx` (optional): target workbook. Defaults to `<tsv path>.xlsx`.
- `--sheet` (optional): worksheet name. Defaults to the TSV’s basename.

### Behavior

1. **Workbook does not exist** → creates one sheet with the TSV contents.
2. **Workbook exists** → appends a new sheet after checking:
   - `[Content_Types].xml`, `xl/workbook.xml`, and `xl/_rels/workbook.xml.rels` are present.
   - No existing sheet has the requested name.
   - A new `xl/worksheets/sheetN.xml` is created, workbook relationships/content-types are updated, and the file is rewritten via a temporary ZIP to preserve integrity.
3. **Duplicate sheet name** → script exits with an error and leaves the workbook untouched.

Use this helper whenever you want to review TSV exports in Excel (e.g., enriched missing-word reports) without manually importing the data.***
