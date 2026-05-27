#!/usr/bin/env python3
"""Экспорт OpenAPI JSON по каждому микросервису (артефакты контракта для CI)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "contracts" / "openapi"
APPS = [
    ("iam", "app.entrypoints.iam"),
    ("legal", "app.entrypoints.legal"),
    ("workspace", "app.entrypoints.workspace"),
    ("reporting", "app.entrypoints.reporting"),
    ("monolith", "app.main"),
]


def main() -> int:
    sys.path.insert(0, str(ROOT))
    OUT.mkdir(parents=True, exist_ok=True)
    for name, modpath in APPS:
        mod = __import__(modpath, fromlist=["app"])
        app = getattr(mod, "app")
        schema = app.openapi()
        p = OUT / f"{name}.openapi.json"
        p.write_text(json.dumps(schema, ensure_ascii=False, indent=2), encoding="utf-8")
        print("wrote", p)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
