#!/usr/bin/env python3
"""Генератор словаря для импорта в Anki-приложение.

Читает scripts/vocab_data.txt (строки `english | перевод`, '#'-комментарии
и пустые строки игнорируются), дедуплицирует по английской части
(регистронезависимо, с сохранением первого варианта) и пишет корректный
CSV (english,русский) с экранированием запятых через csv.writer.
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE / "vocab_data.txt"
OUT = HERE.parent / "public" / "3000-most-used-eng.csv"


def main() -> int:
    pairs: list[tuple[str, str]] = []
    seen: set[str] = set()
    bad: list[tuple[int, str]] = []

    for n, raw in enumerate(DATA.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if " | " not in line:
            bad.append((n, raw))
            continue
        en, ru = (p.strip() for p in line.split(" | ", 1))
        if not en or not ru:
            bad.append((n, raw))
            continue
        key = en.lower()
        if key in seen:
            continue
        seen.add(key)
        pairs.append((en, ru))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(pairs)

    print(f"Записано пар: {len(pairs)} -> {OUT}")
    if bad:
        print(f"Пропущено некорректных строк: {len(bad)}", file=sys.stderr)
        for n, raw in bad[:10]:
            print(f"  строка {n}: {raw!r}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
