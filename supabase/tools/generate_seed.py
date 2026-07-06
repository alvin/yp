#!/usr/bin/env python3
"""Generate repeatable Supabase reference/config seed SQL from Access.

This seed intentionally stays limited to reference/configuration tables. Use
export_access_data.py for the complete production import, including guest PII and
old payment-card fields, in the air-gapped local environment.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from supabase.tools.access_table_map import (  # noqa: E402
    SEED_ACCESS_TABLES,
    SERIAL_COLUMNS,
    TARGET_SCHEMA,
    postgres_table_for_access,
    rewrite_export_sql,
    sequence_reset_sql,
)

DB = ROOT / "legacy-db" / "YPLogicCurrentConsolidated.accdb"
OUTPUT = ROOT / "supabase" / "seed.sql"


def export_insert_sql(access_table: str) -> str:
    exported = subprocess.check_output(
        [
            "mdb-export",
            "-I",
            "postgres",
            "-N",
            TARGET_SCHEMA,
            "-B",
            "-D",
            "%Y-%m-%d",
            "-T",
            "%Y-%m-%d %H:%M:%S",
            "-b",
            "strip",
            str(DB),
            access_table,
        ],
        text=True,
        stderr=subprocess.STDOUT,
    )
    return rewrite_export_sql(exported)


def main() -> None:
    if not DB.exists():
        raise SystemExit(f"Access database not found: {DB}")

    seed_tables = [postgres_table_for_access(table) for table in SEED_ACCESS_TABLES]
    seed_table_set = set(seed_tables)

    parts: list[str] = []
    parts.append(
        "".join(
            [
                "-- =============================================================================\n",
                "-- seed.sql\n",
                "-- Access reference/configuration seed extracted from\n"
                "-- legacy-db/YPLogicCurrentConsolidated.accdb with mdbtools.\n",
                "--\n",
                "-- Includes: application/config rows, lookup tables, tax/exchange/rate tables,\n",
                "-- rooms, inventory, and Access query-helper tables.\n",
                "-- Excludes: production guest/reservation/occupancy/payment/transaction/history\n",
                "-- tables because they contain PII and old payment-card fields. Use\n",
                "-- supabase/tools/export_access_data.py for the complete local import.\n",
                "-- =============================================================================\n\n",
                f"set search_path = {TARGET_SCHEMA}, public;\n\n",
            ]
        )
    )

    truncate_targets = ",\n  ".join(f"{TARGET_SCHEMA}.{table}" for table in seed_tables)
    parts.append(f"truncate table\n  {truncate_targets}\nrestart identity cascade;\n\n")

    for access_table in SEED_ACCESS_TABLES:
        postgres_table = postgres_table_for_access(access_table)
        parts.append(
            f"-- ---- {access_table} -> {TARGET_SCHEMA}.{postgres_table} ----\n"
        )
        exported = export_insert_sql(access_table).strip()
        parts.append((exported if exported else "-- no rows") + "\n\n")

    parts.append("-- Keep serial sequences ahead of seeded Access IDs.\n")
    for table, column in SERIAL_COLUMNS:
        if table in seed_table_set:
            parts.append(sequence_reset_sql(table, column) + "\n")

    _ = OUTPUT.write_text("".join(parts))
    print(f"Wrote {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
