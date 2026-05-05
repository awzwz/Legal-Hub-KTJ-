"""Extract mockCases / mockNotifications / mockAuditLog from frontend/src/data/offlineMockData.ts → demo_dataset.json."""
from __future__ import annotations

import json
import re
from pathlib import Path


def _slice_array(text: str, marker: str) -> str:
    i = text.find(marker)
    if i < 0:
        raise SystemExit(f"marker not found: {marker}")
    i = text.find("=", i)
    if i < 0:
        raise SystemExit("= not found after marker")
    i = text.find("[", i)
    if i < 0:
        raise SystemExit("opening [ not found")
    depth = 0
    start = i
    for j in range(i, len(text)):
        c = text[j]
        if c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                return text[start : j + 1]
    raise SystemExit("unbalanced brackets")


def _ts_to_json(s: str) -> str:
    s = re.sub(r"//[^\n]*", "", s)
    s = re.sub(r",\s*([}\]])", r"\1", s)
    s = re.sub(r"'([^'\\]*(?:\\.[^'\\]*)*)'", lambda m: json.dumps(m.group(1).replace("\\'", "'")), s)
    # TS object keys: word before colon (not inside strings — mockData uses double-quoted strings only)
    s = re.sub(r'([\[\{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', s)
    return s


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    ts_path = root / "frontend" / "src" / "data" / "offlineMockData.ts"
    out_path = root / "backend" / "demo" / "demo_dataset.json"
    text = ts_path.read_text(encoding="utf-8")
    parts = {}
    for key, marker in (
        ("cases", "export const mockCases"),
        ("notifications", "export const mockNotifications"),
        ("auditLog", "export const mockAuditLog"),
    ):
        raw = _slice_array(text, marker)
        parts[key] = json.loads(_ts_to_json(raw))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(parts, ensure_ascii=False), encoding="utf-8")
    print("wrote", out_path, "bytes", out_path.stat().st_size)


if __name__ == "__main__":
    main()
