from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET

XLSX = "/private/tmp/ultimate-lines-sheet.xlsx"
NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


def col_index(cell_ref: str) -> int:
    letters = re.match(r"([A-Z]+)", cell_ref).group(1)
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n


def row_index(cell_ref: str) -> int:
    return int(re.search(r"(\d+)", cell_ref).group(1))


def load_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    strings = []
    for si in root.findall("a:si", NS):
        parts = []
        for t in si.findall(".//a:t", NS):
            parts.append(t.text or "")
        strings.append("".join(parts))
    return strings


def load_sheet_map(zf: zipfile.ZipFile) -> dict[str, str]:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rel_by_id = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels.findall("rel:Relationship", NS)
    }
    sheet_map = {}
    for sheet in workbook.findall("a:sheets/a:sheet", NS):
        name = sheet.attrib["name"]
        rel_id = sheet.attrib[f"{{{NS['r']}}}id"]
        target = rel_by_id[rel_id]
        path = "xl/" + target if not target.startswith("/") else target[1:]
        sheet_map[name] = path
    return sheet_map


def cell_value(cell: ET.Element, shared: list[str]):
    formula = cell.find("a:f", NS)
    value = cell.find("a:v", NS)
    inline = cell.find("a:is/a:t", NS)
    ctype = cell.attrib.get("t")
    rendered = None
    if ctype == "s" and value is not None and value.text is not None:
        rendered = shared[int(value.text)]
    elif inline is not None:
        rendered = inline.text
    elif value is not None:
        rendered = value.text
    return rendered, formula.text if formula is not None else None


def print_sheet(zf: zipfile.ZipFile, shared: list[str], name: str, path: str, max_row=120, max_col=60):
    root = ET.fromstring(zf.read(path))
    dim = root.find("a:dimension", NS)
    print(f"\n=== {name} ({path}) dimension={dim.attrib.get('ref') if dim is not None else '?'} ===")
    rows: dict[int, list[str]] = {}
    for cell in root.findall(".//a:c", NS):
        ref = cell.attrib["r"]
        r = row_index(ref)
        c = col_index(ref)
        if r > max_row or c > max_col:
            continue
        rendered, formula = cell_value(cell, shared)
        if rendered in (None, "") and formula in (None, ""):
            continue
        text = f"{ref}="
        if formula:
            text += f"FORMULA({formula})"
            if rendered not in (None, ""):
                text += f" -> {json.dumps(rendered)}"
        else:
            text += json.dumps(rendered)
        rows.setdefault(r, []).append(text)
    for r in sorted(rows):
        print(" | ".join(rows[r]))


with zipfile.ZipFile(XLSX) as zf:
    shared = load_shared_strings(zf)
    sheet_map = load_sheet_map(zf)
    print("SHEETS", json.dumps(sheet_map, indent=2))
    for name in ["Template", "G1", "G2", "Tourn_Summary", "Print_Stats"]:
        print_sheet(zf, shared, name, sheet_map[name])

