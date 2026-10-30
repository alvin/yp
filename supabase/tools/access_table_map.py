"""Access source table names mapped to Supabase-friendly snake_case names.

Only the Access tables the system uses are mapped (TABLES); the rest stay in the
Access file (LEFT_IN_ACCESS). Columns intentionally remain the mdbtools-normalized
Access field names so data can be exported directly from the .accdb and loaded
without per-column transforms.
"""

from __future__ import annotations

import re
import subprocess
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

TARGET_SCHEMA = "ypl"


@dataclass(frozen=True)
class AccessTable:
    access_name: str
    postgres_name: str

    @property
    def mdbtools_name(self) -> str:
        """Name emitted by mdb-export/mdb-schema for PostgreSQL identifiers."""
        return self.access_name.lower()


# The Access tables the system uses: each is read by a screen, report, view,
# function or rule. The import loads these and only these.
TABLES: tuple[AccessTable, ...] = (
    AccessTable("tblExchangeRate", "exchange_rates"),
    AccessTable("tblGuest", "guests"),
    AccessTable("tblHousekeeping", "housekeeping_notes"),
    AccessTable("tblInventory", "inventory_items"),
    AccessTable("tblKitchenMeal", "kitchen_meals"),
    AccessTable("tblLookupInventoryType", "lookup_inventory_types"),
    AccessTable("tblLookupPaymentCategory", "lookup_payment_categories"),
    AccessTable("tblLookupPaymentType", "lookup_payment_types"),
    AccessTable("tblLookupRoomRateCode", "lookup_room_rate_codes"),
    AccessTable("tblLookupRoomRateType", "lookup_room_rate_types"),
    AccessTable("tblLookupRoomType", "lookup_room_types"),
    AccessTable("tblLookupSalutation", "lookup_salutations"),
    AccessTable("tblLookupTaxRateType", "lookup_tax_rate_types"),
    AccessTable("tblOccupancy", "room_assignments"),
    AccessTable("tblPayment", "payments"),
    AccessTable("tblReservation", "reservations"),
    AccessTable("tblReservationGuest", "reservation_guests"),
    AccessTable("tblRoom", "rooms"),
    AccessTable("tblRoomRate", "room_rates"),
    AccessTable("tblTaxRate", "tax_rates"),
    AccessTable("tblTransaction", "transactions"),
    AccessTable("tblLookupPhoneFaxType", "lookup_phone_fax_types"),
    AccessTable("tblLookupTransactionType", "lookup_transaction_types"),
)

# Access tables nothing in the system reads, so the import and the seed leave
# them in the Access file and the schema has no table for them (0034). Every
# table in the Access file is in TABLES or here; export_access_data.py refuses
# an Access table that is in neither, so a new one is decided on, not dropped.
LEFT_IN_ACCESS: tuple[str, ...] = (
    # Access's own settings: about, registration, version and object lists,
    # and its compact-error log.
    "tblApplicationInformation",
    "tblApplicationInformationFROMBACK",
    "tblApplicationObjects",
    "tblApplicationRegistration",
    "tblApplicationSpecification",
    "tblApplicationVersion",
    "MSysCompactError",
    # Access's user list: staff names and initials.
    "tblLookupUser",
    # Lookups the new screens don't offer.
    "tblLookupCity",
    "tblLookupCountry",
    "tblLookupRegion",
    "tblLookupGuestDiet",
    "tblLookupShuttleSite",
    "tblLookupPaymentCode",
    "tblLookupInventoryCode",
    # Copies of the live tables, kept by Access as backups.
    "tblHousekeepingBACKUP",
    "tblOccupancyBACKUP",
    "tblPaymentBACKUP",
    "tblReservationBACKUP",
    "tblReservationGuestBACKUP",
    "tblTransactionBACKUP",
    # Helper and scratch tables Access's forms and reports used.
    "tblMailout",
    "tblResBoard",
    "tblKitchenMealNEW",
    "tblPaymentTypeZero",
    "tblPaymentZero",
    "tblInventoryRate",
    "tblInventoryRate2",
    "tblInventoryTax",
    "tblInventoryTax2",
    "tblCalcTaxRateFilter",
    "tblCalcTaxRateFilter2",
    "tblChooseRoomRate",
    "tblChooseRoomRate2",
    # Tables from old rate and price loads, and the shuttle log (empty).
    "tblRoomRateNEW",
    "tblInventoryExcel",
    "tblShuttle",
)

TABLE_RENAMES: dict[str, str] = {
    table.mdbtools_name: table.postgres_name for table in TABLES
}

# The setup a system needs to start without an Access file: rooms and their
# rates, the price list, tax and exchange rates, and the pick lists the screens
# and rules read. No guest, booking or payment data (PII and old payment-card
# fields): export_access_data.py loads those with the rest of TABLES.
SEED_ACCESS_TABLES: tuple[str, ...] = (
    "tblLookupInventoryType",
    "tblLookupPaymentCategory",
    "tblLookupPaymentType",
    "tblLookupPhoneFaxType",
    "tblLookupRoomRateCode",
    "tblLookupRoomRateType",
    "tblLookupRoomType",
    "tblLookupSalutation",
    "tblLookupTaxRateType",
    "tblLookupTransactionType",
    "tblExchangeRate",
    "tblTaxRate",
    "tblRoom",
    "tblRoomRate",
    "tblInventory",
)

# The SERIAL columns of the tables in TABLES, reset past the loaded Access IDs.
SERIAL_COLUMNS: tuple[tuple[str, str], ...] = (
    ("exchange_rates", "exchangerateid"),
    ("guests", "guestid"),
    ("housekeeping_notes", "housekeepingnotesid"),
    ("inventory_items", "inventoryid"),
    ("kitchen_meals", "kitchenmealid"),
    ("room_assignments", "occupancyid"),
    ("payments", "paymentid"),
    ("reservations", "reservationid"),
    ("reservation_guests", "reservationguestid"),
    ("rooms", "roomid"),
    ("room_rates", "roomrateid"),
    ("tax_rates", "taxrateid"),
    ("transactions", "transactionid"),
)


def undecided_tables(access_tables: Iterable[str]) -> list[str]:
    """The Access tables in neither TABLES nor LEFT_IN_ACCESS, sorted."""
    decided = {table.access_name for table in TABLES} | set(LEFT_IN_ACCESS)
    return sorted(set(access_tables) - decided)


def postgres_table_for_access(access_name: str) -> str:
    try:
        return TABLE_RENAMES[access_name.lower()]
    except KeyError as exc:
        raise KeyError(
            f"No PostgreSQL table mapping for Access table {access_name!r}"
        ) from exc


_ZERO_DAY_TIMESTAMP = re.compile(r"'\d{4}-\d{2}-00(?: \d{2}:\d{2}:\d{2})?'")


def rewrite_export_sql(sql: str) -> str:
    """Rewrite mdb-export INSERT targets from Access table names to ypl table names."""
    # Access stores "zero dates" (day 00, e.g. 1900-01-00) that PostgreSQL
    # rejects; they carry no information, so they import as NULL.
    rewritten = _ZERO_DAY_TIMESTAMP.sub("NULL", sql)
    for access_name, postgres_name in sorted(
        TABLE_RENAMES.items(), key=lambda item: len(item[0]), reverse=True
    ):
        rewritten = rewritten.replace(
            f'"{TARGET_SCHEMA}"."{access_name}"',
            f'"{TARGET_SCHEMA}"."{postgres_name}"',
        )
        rewritten = rewritten.replace(
            f"{TARGET_SCHEMA}.{access_name}",
            f"{TARGET_SCHEMA}.{postgres_name}",
        )
    return rewritten


def export_insert_sql(access_db: Path, access_table: str) -> str:
    """One Access table as INSERT statements into its ypl table (mdb-export)."""
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
            str(access_db),
            access_table,
        ],
        text=True,
        stderr=subprocess.STDOUT,
    )
    return rewrite_export_sql(exported)


# Lookup values the lodge has retired. Access still carries them, so every
# load from Access leaves them off the list; records that used one keep it.
RETIRED_LOOKUP_VALUES: tuple[tuple[str, str, str], ...] = (
    ("lookup_payment_types", "paymenttype", "ICS Crossover"),
)


def retired_lookup_sql() -> str:
    return "\n".join(
        f"delete from {TARGET_SCHEMA}.{table} where {column} = '{value}';"
        for table, column, value in RETIRED_LOOKUP_VALUES
    )


def sequence_reset_sql(table: str, column: str) -> str:
    return "\n".join(
        [
            "select setval(",
            f"  pg_get_serial_sequence('{TARGET_SCHEMA}.{table}', '{column}'),",
            f"  coalesce((select max({column}) from {TARGET_SCHEMA}.{table}), 1),",
            f"  (select max({column}) is not null from {TARGET_SCHEMA}.{table})",
            ");",
        ]
    )
