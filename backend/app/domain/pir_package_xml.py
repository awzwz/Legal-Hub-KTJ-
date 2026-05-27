"""XLSX-пакет (ZIP) post-processing: чистка orphan-частей и сборка финального файла.

Извлечено из ``pir_excel_fill`` — функции оперируют только над байтовым словарём
``dict[str, bytes]`` и не зависят от модели данных. После того как openpyxl
сгенерирует свой набор листов, мы вмерживаем их в исходный шаблон, чтобы
сохранить кастомные docProps/app.xml и стили, не унаследованные openpyxl.
"""

from __future__ import annotations

import re
import zipfile
from io import BytesIO
from pathlib import Path

_CALCCHAIN_REL_RE = re.compile(
    r'<Relationship\b[^>]*?(?:relationships/calcChain|calcChain\.xml)[^>]*/>\s*',
    re.IGNORECASE,
)
_CT_CALCCHAIN_RE = re.compile(
    r'<Override\s+PartName="/xl/calcChain\.xml"[^>]*/>\s*',
    re.IGNORECASE,
)
_DRAWING_REL_RE = re.compile(
    r'<Relationship\b[^>]*?(?:relationships/drawing|/drawings/drawing)[^>]*/>\s*',
    re.IGNORECASE,
)
_CT_DRAWING_RE = re.compile(
    r'<Override\s+PartName="/xl/drawings/[^"]+"[^>]*/>\s*',
    re.IGNORECASE,
)
_CT_SHAREDSTRINGS_RE = re.compile(
    r'<Override\s+PartName="/xl/sharedStrings\.xml"[^>]*/>\s*',
    re.IGNORECASE,
)
_SS_REL_RE = re.compile(
    r'<Relationship\b[^>]*?(?:relationships/sharedStrings|sharedStrings\.xml)[^>]*/>\s*',
    re.IGNORECASE,
)


def _worksheets_use_shared_string_type(parts: dict[str, bytes]) -> bool:
    """True if any sheet cell uses shared-string index (t=\"s\")."""
    for key, payload in parts.items():
        if not key.startswith("xl/worksheets/sheet") or not key.endswith(".xml"):
            continue
        if "/_rels/" in key:
            continue
        if b't="s"' in payload or b"t='s'" in payload:
            return True
    return False


def _strip_orphan_shared_strings_package(parts: dict[str, bytes]) -> None:
    if _worksheets_use_shared_string_type(parts):
        return
    parts.pop("xl/sharedStrings.xml", None)
    rk = "xl/_rels/workbook.xml.rels"
    if rk in parts:
        txt = parts[rk].decode("utf-8")
        parts[rk] = _SS_REL_RE.sub("", txt).encode("utf-8")
    ct = "[Content_Types].xml"
    if ct in parts:
        txt = parts[ct].decode("utf-8")
        parts[ct] = _CT_SHAREDSTRINGS_RE.sub("", txt).encode("utf-8")


def _strip_legacy_drawings(parts: dict[str, bytes]) -> None:
    for k in [k for k in parts if k.startswith("xl/drawings/")]:
        del parts[k]

    for key in list(parts):
        if key.startswith("xl/worksheets/_rels/") and key.endswith(".rels"):
            txt = parts[key].decode("utf-8")
            parts[key] = _DRAWING_REL_RE.sub("", txt).encode("utf-8")

    ct = "[Content_Types].xml"
    if ct in parts:
        txt = parts[ct].decode("utf-8")
        parts[ct] = _CT_DRAWING_RE.sub("", txt).encode("utf-8")


def _strip_orphan_sheets_package(parts: dict[str, bytes], mod_keys: set[str]) -> None:
    """Удалить из шаблона worksheet-файлы, которых нет в openpyxl-выгрузке.

    Эти файлы остались от листов, которые мы удалили в openpyxl (исп. производство и т.п.).
    Excel/Numbers могут предупреждать про «orphan parts», если не убрать их из ZIP.
    """
    mod_sheets = {
        n
        for n in mod_keys
        if n.startswith("xl/worksheets/sheet") and n.endswith(".xml") and "/_rels/" not in n
    }
    orphans: list[str] = []
    for key in list(parts):
        if (
            key.startswith("xl/worksheets/sheet")
            and key.endswith(".xml")
            and "/_rels/" not in key
            and key not in mod_sheets
        ):
            orphans.append(key)
            del parts[key]
    for key in list(parts):
        if key.startswith("xl/worksheets/_rels/sheet") and key.endswith(".xml.rels"):
            sheet_file = "xl/worksheets/" + key[len("xl/worksheets/_rels/") : -len(".rels")]
            if sheet_file in orphans:
                del parts[key]
    ct = "[Content_Types].xml"
    if ct in parts and orphans:
        txt = parts[ct].decode("utf-8")
        for orphan in orphans:
            pat = re.compile(
                r'<Override\s+PartName="/' + re.escape(orphan) + r'"[^>]*/>\s*',
                re.IGNORECASE,
            )
            txt = pat.sub("", txt)
        parts[ct] = txt.encode("utf-8")


def _strip_calc_chain_package(parts: dict[str, bytes]) -> None:
    parts.pop("xl/calcChain.xml", None)
    rk = "xl/_rels/workbook.xml.rels"
    if rk in parts:
        txt = parts[rk].decode("utf-8")
        parts[rk] = _CALCCHAIN_REL_RE.sub("", txt).encode("utf-8")
    ct = "[Content_Types].xml"
    if ct in parts:
        txt = parts[ct].decode("utf-8")
        parts[ct] = _CT_CALCCHAIN_RE.sub("", txt).encode("utf-8")


def merge_openpyxl_into_template_package(template_path: Path, openpyxl_bytes: bytes) -> bytes:
    """Подменяет в шаблоне worksheets/styles/sharedStrings/workbook своими,
    сохраняя ``docProps/app.xml`` шаблона и общий порядок файлов в ZIP."""
    if not template_path.is_file():
        return openpyxl_bytes
    with zipfile.ZipFile(template_path, "r") as ztpl:
        template_order = ztpl.namelist()
        template_meta = {zi.filename: zi for zi in ztpl.infolist()}
        parts: dict[str, bytes] = {n: ztpl.read(n) for n in template_order}
        app_xml = parts.get("docProps/app.xml")

    with zipfile.ZipFile(BytesIO(openpyxl_bytes), "r") as zmod:
        mod = {n: zmod.read(n) for n in zmod.namelist()}

    for name, payload in mod.items():
        if name.startswith("xl/worksheets/"):
            parts[name] = payload
        elif name in (
            "xl/styles.xml",
            "xl/sharedStrings.xml",
            "xl/workbook.xml",
            "xl/_rels/workbook.xml.rels",
        ):
            parts[name] = payload
        elif name == "docProps/core.xml":
            parts[name] = payload

    if app_xml is not None:
        parts["docProps/app.xml"] = app_xml

    _strip_orphan_sheets_package(parts, set(mod.keys()))
    _strip_calc_chain_package(parts)
    _strip_legacy_drawings(parts)
    _strip_orphan_shared_strings_package(parts)

    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        for name in template_order:
            if name not in parts:
                continue
            data = parts[name]
            src = template_meta.get(name)
            info = zipfile.ZipInfo(filename=name)
            if src is not None:
                info.compress_type = src.compress_type
                info.external_attr = src.external_attr
                info.date_time = src.date_time
            else:
                info.compress_type = zipfile.ZIP_DEFLATED
            zout.writestr(info, data)

    raw = buf.getvalue()
    with zipfile.ZipFile(BytesIO(raw), "r") as zcheck:
        bad = zcheck.testzip()
    if bad is not None:
        raise RuntimeError(f"PIR xlsx failed ZIP integrity check: {bad}")
    return raw
