#!/usr/bin/env python3
"""Convert a TSV file into an XLSX workbook (create or append worksheets)."""
from __future__ import annotations

import argparse
import csv
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Iterable, List
from xml.sax.saxutils import escape
import xml.etree.ElementTree as ET


SPREADSHEET_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_DOC_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL_PKG_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
CONTENT_TYPES_NS = "http://schemas.openxmlformats.org/package/2006/content-types"

CONTENT_TYPE_WORKBOOK = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"
CONTENT_TYPE_WORKSHEET = "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"
CONTENT_TYPE_STYLES = "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"
REL_TYPE_WORKSHEET = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"
REL_TYPE_STYLES = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"

INVALID_SHEET_CHARS = set('[]:*?/\\')
SHEET_FILE_RE = re.compile(r"^xl/worksheets/sheet(\d+)\.xml$")


RELS_XML = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>
""".strip()

STYLES_XML = """<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <fonts count="1"><font/></fonts>
    <fills count="1"><fill/></fills>
    <borders count="1"><border/></borders>
    <cellStyleXfs count="1"><xf/></cellStyleXfs>
    <cellXfs count="1"><xf/></cellXfs>
</styleSheet>
""".strip()


def sanitize_sheet_name(name: str) -> str:
    cleaned = "".join(ch for ch in name if ch not in INVALID_SHEET_CHARS).strip()
    if not cleaned:
        cleaned = "Sheet1"
    if len(cleaned) > 31:
        cleaned = cleaned[:31]
    return cleaned


def column_letter(idx: int) -> str:
    """Convert zero-based column index to Excel column letters."""
    result = ""
    idx += 1
    while idx:
        idx, remainder = divmod(idx - 1, 26)
        result = chr(65 + remainder) + result
    return result


def build_sheet_xml(rows: Iterable[List[str]]) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
        "  <sheetData>",
    ]
    for row_idx, row in enumerate(rows, start=1):
        lines.append(f'    <row r="{row_idx}">')
        for col_idx, value in enumerate(row):
            col_letter = column_letter(col_idx)
            cell_ref = f"{col_letter}{row_idx}"
            text = escape(value)
            lines.append(
                f'      <c r="{cell_ref}" t="inlineStr"><is><t xml:space="preserve">{text}</t></is></c>'
            )
        lines.append("    </row>")
    lines.extend(["  </sheetData>", "</worksheet>"])
    return "\n".join(lines)


def load_tsv(tsv_path: Path) -> List[List[str]]:
    with tsv_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle, delimiter="\t")
        return [row for row in reader]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert a TSV file into an XLSX workbook.")
    parser.add_argument("tsv_path", type=Path, help="Path to the TSV file to convert.")
    parser.add_argument(
        "--xlsx",
        type=Path,
        help="Existing or new XLSX workbook to write (defaults to tsv_path with .xlsx).",
    )
    parser.add_argument(
        "--sheet",
        help="Worksheet name (defaults to sanitized TSV filename).",
    )
    return parser.parse_args()


def build_content_types_xml(sheet_filename: str) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="{CONTENT_TYPES_NS}">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/xl/workbook.xml" ContentType="{CONTENT_TYPE_WORKBOOK}"/>
    <Override PartName="/xl/worksheets/{sheet_filename}" ContentType="{CONTENT_TYPE_WORKSHEET}"/>
    <Override PartName="/xl/styles.xml" ContentType="{CONTENT_TYPE_STYLES}"/>
</Types>
""".strip()


def build_workbook_xml(sheet_name: str, sheet_id: int = 1, rel_id: str = "rId1") -> str:
    safe_name = escape(sheet_name, {"'": "&apos;"})
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="{SPREADSHEET_NS}" xmlns:r="{REL_DOC_NS}">
    <sheets>
        <sheet name="{safe_name}" sheetId="{sheet_id}" r:id="{rel_id}"/>
    </sheets>
</workbook>
""".strip()


def build_workbook_rels_xml(sheet_filename: str) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="{REL_PKG_NS}">
    <Relationship Id="rId1" Type="{REL_TYPE_WORKSHEET}" Target="worksheets/{sheet_filename}"/>
    <Relationship Id="rId2" Type="{REL_TYPE_STYLES}" Target="styles.xml"/>
</Relationships>
""".strip()


def serialize_xml(element: ET.Element) -> bytes:
    return ET.tostring(element, encoding="utf-8", xml_declaration=True)


def to_bytes(text: str) -> bytes:
    return text.encode("utf-8")


def create_new_workbook(xlsx_path: Path, sheet_name: str, data: List[List[str]]) -> None:
    sheet_filename = "sheet1.xml"
    sheet_xml = build_sheet_xml(data)
    with zipfile.ZipFile(xlsx_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", to_bytes(build_content_types_xml(sheet_filename)))
        zf.writestr("_rels/.rels", to_bytes(RELS_XML))
        zf.writestr("xl/workbook.xml", to_bytes(build_workbook_xml(sheet_name)))
        zf.writestr("xl/_rels/workbook.xml.rels", to_bytes(build_workbook_rels_xml(sheet_filename)))
        zf.writestr("xl/styles.xml", to_bytes(STYLES_XML))
        zf.writestr(f"xl/worksheets/{sheet_filename}", to_bytes(sheet_xml))


def append_sheet_to_workbook(xlsx_path: Path, sheet_name: str, data: List[List[str]]) -> None:
    with zipfile.ZipFile(xlsx_path, "r") as existing:
        entries = {info.filename: existing.read(info.filename) for info in existing.infolist()}

    required_files = ["[Content_Types].xml", "xl/workbook.xml", "xl/_rels/workbook.xml.rels"]
    for req in required_files:
        if req not in entries:
            sys.exit(f"Workbook {xlsx_path} is missing required part: {req}")

    ct_root = ET.fromstring(entries["[Content_Types].xml"])
    workbook_root = ET.fromstring(entries["xl/workbook.xml"])
    rels_root = ET.fromstring(entries["xl/_rels/workbook.xml.rels"])

    sheets_elem = workbook_root.find(f"{{{SPREADSHEET_NS}}}sheets")
    if sheets_elem is None:
        sys.exit("Workbook is missing <sheets> element.")

    existing_names = {
        sheet.get("name", "")
        for sheet in sheets_elem.findall(f"{{{SPREADSHEET_NS}}}sheet")
    }
    if sheet_name in existing_names:
        sys.exit(f"Worksheet '{sheet_name}' already exists in {xlsx_path}")

    def safe_int(value: str, default: int = 0) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    sheet_ids = [
        safe_int(sheet.get("sheetId"))
        for sheet in sheets_elem.findall(f"{{{SPREADSHEET_NS}}}sheet")
    ]
    new_sheet_id = (max(sheet_ids) + 1) if sheet_ids else 1

    sheet_files = [name for name in entries if SHEET_FILE_RE.match(name)]
    max_idx = 0
    for name in sheet_files:
        match = SHEET_FILE_RE.match(name)
        if match:
            max_idx = max(max_idx, int(match.group(1)))
    new_sheet_index = max_idx + 1 if max_idx else len(sheet_files) + 1 or 1
    sheet_filename = f"sheet{new_sheet_index}.xml"
    sheet_path = f"xl/worksheets/{sheet_filename}"
    if sheet_path in entries:
        sys.exit(f"Sheet path '{sheet_path}' already exists.")

    rel_elements = rels_root.findall(f"{{{REL_PKG_NS}}}Relationship")
    rel_ids = []
    for rel in rel_elements:
        rel_id = rel.get("Id", "")
        if rel_id.startswith("rId"):
            try:
                rel_ids.append(int(rel_id[3:]))
            except ValueError:
                continue
    new_rel_number = (max(rel_ids) + 1) if rel_ids else 1
    new_rel_id = f"rId{new_rel_number}"

    ET.SubElement(
        sheets_elem,
        f"{{{SPREADSHEET_NS}}}sheet",
        attrib={
            "name": sheet_name,
            "sheetId": str(new_sheet_id),
            f"{{{REL_DOC_NS}}}id": new_rel_id,
        },
    )

    ET.SubElement(
        rels_root,
        f"{{{REL_PKG_NS}}}Relationship",
        attrib={
            "Id": new_rel_id,
            "Type": REL_TYPE_WORKSHEET,
            "Target": f"worksheets/{sheet_filename}",
        },
    )

    override_tag = f"{{{CONTENT_TYPES_NS}}}Override"
    part_name = f"/xl/worksheets/{sheet_filename}"
    if not any(elem.get("PartName") == part_name for elem in ct_root.findall(override_tag)):
        ET.SubElement(
            ct_root,
            override_tag,
            attrib={
                "PartName": part_name,
                "ContentType": CONTENT_TYPE_WORKSHEET,
            },
        )

    sheet_bytes = to_bytes(build_sheet_xml(data))
    entries["[Content_Types].xml"] = serialize_xml(ct_root)
    entries["xl/workbook.xml"] = serialize_xml(workbook_root)
    entries["xl/_rels/workbook.xml.rels"] = serialize_xml(rels_root)
    entries[sheet_path] = sheet_bytes

    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
    tmp_path = Path(tmp_file.name)
    tmp_file.close()
    try:
        with zipfile.ZipFile(tmp_path, "w", compression=zipfile.ZIP_DEFLATED) as new_zip:
            for name, content in entries.items():
                new_zip.writestr(name, content)
        shutil.move(str(tmp_path), xlsx_path)
    finally:
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except OSError:
                pass


def main() -> None:
    args = parse_args()
    tsv_path = args.tsv_path
    if not tsv_path.is_file():
        sys.exit(f"TSV file not found: {tsv_path}")

    data = load_tsv(tsv_path)
    xlsx_path = args.xlsx or tsv_path.with_suffix(".xlsx")
    sheet_name = sanitize_sheet_name(args.sheet or tsv_path.stem or "Sheet1")

    if xlsx_path.exists():
        append_sheet_to_workbook(xlsx_path, sheet_name, data)
        print(f"Appended '{sheet_name}' to {xlsx_path}")
    else:
        create_new_workbook(xlsx_path, sheet_name, data)
        print(f"Created {xlsx_path} with sheet '{sheet_name}'")


if __name__ == "__main__":
    main()
