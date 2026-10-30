#!/usr/bin/env python3
"""Generate repeatable Supabase setup seed SQL from Access.

The seed is the setup a system needs to start without an Access file to load
(access_table_map.SEED_ACCESS_TABLES): rooms and their rates, the price list, tax
and exchange rates, and the pick lists the system reads. Use
export_access_data.py for the complete production import, including guest PII and
old payment-card fields, in the air-gapped local environment.
"""

from __future__ import annotations

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
    retired_lookup_sql,
    export_insert_sql,
    sequence_reset_sql,
)

DB = ROOT / "legacy-db" / "YPLogicCurrentConsolidated.accdb"
OUTPUT = ROOT / "supabase" / "seed.sql"


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
                "-- The setup the system uses, extracted from\n"
                "-- legacy-db/YPLogicCurrentConsolidated.accdb with mdbtools.\n",
                "--\n",
                "-- Includes: rooms and their rates, the price list, tax and exchange rates,\n",
                "-- and the pick lists the screens and rules read.\n",
                "-- Excludes: guest, booking, charge and payment records (PII and old\n",
                "-- payment-card fields), which supabase/tools/export_access_data.py loads,\n",
                "-- and the Access tables nothing in the system reads.\n",
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
        exported = export_insert_sql(DB, access_table).strip()
        parts.append((exported if exported else "-- no rows") + "\n\n")

    parts.append("-- Lookup values the lodge has retired.\n" + retired_lookup_sql() + "\n\n")
    parts.append("-- Keep serial sequences ahead of seeded Access IDs.\n")
    for table, column in SERIAL_COLUMNS:
        if table in seed_table_set:
            parts.append(sequence_reset_sql(table, column) + "\n")

    _ = OUTPUT.write_text("".join(parts))
    print(f"Wrote {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
