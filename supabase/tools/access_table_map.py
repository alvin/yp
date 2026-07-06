"""Access source table names mapped to Supabase-friendly snake_case names.

Columns intentionally remain the mdbtools-normalized Access field names so data can
be exported directly from the .accdb and loaded without per-column transforms.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

TARGET_SCHEMA = "ypl"


@dataclass(frozen=True)
class AccessTable:
    access_name: str
    postgres_name: str

    @property
    def mdbtools_name(self) -> str:
        """Name emitted by mdb-export/mdb-schema for PostgreSQL identifiers."""
        return self.access_name.lower()


TABLES: tuple[AccessTable, ...] = (
    AccessTable("tblApplicationInformation", "application_information"),
    AccessTable(
        "tblApplicationInformationFROMBACK", "application_information_from_back"
    ),
    AccessTable("tblApplicationObjects", "application_objects"),
    AccessTable("tblApplicationRegistration", "application_registration"),
    AccessTable("tblApplicationSpecification", "application_specifications"),
    AccessTable("tblApplicationVersion", "application_versions"),
    AccessTable("tblExchangeRate", "exchange_rates"),
    AccessTable("tblGuest", "guests"),
    AccessTable("tblHousekeeping", "housekeeping_notes"),
    AccessTable("tblHousekeepingBACKUP", "housekeeping_notes_backup"),
    AccessTable("tblInventory", "inventory_items"),
    AccessTable("tblKitchenMeal", "kitchen_meals"),
    AccessTable("tblKitchenMealNEW", "kitchen_meals_new"),
    AccessTable("tblLookupCity", "lookup_cities"),
    AccessTable("tblLookupGuestDiet", "lookup_guest_diets"),
    AccessTable("tblLookupInventoryCode", "lookup_inventory_codes"),
    AccessTable("tblLookupInventoryType", "lookup_inventory_types"),
    AccessTable("tblLookupPaymentCategory", "lookup_payment_categories"),
    AccessTable("tblLookupPaymentCode", "lookup_payment_codes"),
    AccessTable("tblLookupPaymentType", "lookup_payment_types"),
    AccessTable("tblLookupRegion", "lookup_regions"),
    AccessTable("tblLookupRoomRateCode", "lookup_room_rate_codes"),
    AccessTable("tblLookupRoomRateType", "lookup_room_rate_types"),
    AccessTable("tblLookupRoomType", "lookup_room_types"),
    AccessTable("tblLookupSalutation", "lookup_salutations"),
    AccessTable("tblLookupShuttleSite", "lookup_shuttle_sites"),
    AccessTable("tblLookupTaxRateType", "lookup_tax_rate_types"),
    AccessTable("tblLookupUser", "lookup_users"),
    AccessTable("tblMailout", "mailouts"),
    AccessTable("tblOccupancy", "room_assignments"),
    AccessTable("tblOccupancyBACKUP", "room_assignments_backup"),
    AccessTable("tblPayment", "payments"),
    AccessTable("tblPaymentBACKUP", "payments_backup"),
    AccessTable("tblPaymentTypeZero", "payment_type_zero"),
    AccessTable("tblPaymentZero", "payment_zero"),
    AccessTable("tblResBoard", "reservation_board"),
    AccessTable("tblReservation", "reservations"),
    AccessTable("tblReservationBACKUP", "reservations_backup"),
    AccessTable("tblReservationGuest", "reservation_guests"),
    AccessTable("tblReservationGuestBACKUP", "reservation_guests_backup"),
    AccessTable("tblRoom", "rooms"),
    AccessTable("tblRoomRate", "room_rates"),
    AccessTable("tblRoomRateNEW", "room_rates_new"),
    AccessTable("tblShuttle", "shuttles"),
    AccessTable("tblTaxRate", "tax_rates"),
    AccessTable("tblTransaction", "transactions"),
    AccessTable("tblTransactionBACKUP", "transactions_backup"),
    AccessTable("MSysCompactError", "access_compact_errors"),
    AccessTable("tblInventoryExcel", "inventory_excel_import"),
    AccessTable("tblLookupCountry", "lookup_countries"),
    AccessTable("tblLookupPhoneFaxType", "lookup_phone_fax_types"),
    AccessTable("tblLookupTransactionType", "lookup_transaction_types"),
    AccessTable("tblInventoryRate", "inventory_rates"),
    AccessTable("tblInventoryRate2", "inventory_rates_2"),
    AccessTable("tblCalcTaxRateFilter", "calc_tax_rate_filters"),
    AccessTable("tblCalcTaxRateFilter2", "calc_tax_rate_filters_2"),
    AccessTable("tblChooseRoomRate", "choose_room_rates"),
    AccessTable("tblChooseRoomRate2", "choose_room_rates_2"),
    AccessTable("tblInventoryTax", "inventory_taxes"),
    AccessTable("tblInventoryTax2", "inventory_taxes_2"),
)

TABLE_RENAMES: dict[str, str] = {
    table.mdbtools_name: table.postgres_name for table in TABLES
}
ACCESS_NAME_BY_POSTGRES: dict[str, str] = {
    table.postgres_name: table.access_name for table in TABLES
}

# Reference/configuration tables that are useful as repeatable Supabase seed data.
# Full production data, including PII and payment-card fields, is handled by
# export_access_data.py.
SEED_ACCESS_TABLES: tuple[str, ...] = (
    "tblApplicationInformation",
    "tblApplicationInformationFROMBACK",
    "tblApplicationObjects",
    "tblApplicationRegistration",
    "tblApplicationSpecification",
    "tblApplicationVersion",
    "tblLookupCity",
    "tblLookupCountry",
    "tblLookupGuestDiet",
    "tblLookupInventoryCode",
    "tblLookupInventoryType",
    "tblLookupPaymentCategory",
    "tblLookupPaymentCode",
    "tblLookupPaymentType",
    "tblLookupPhoneFaxType",
    "tblLookupRegion",
    "tblLookupRoomRateCode",
    "tblLookupRoomRateType",
    "tblLookupRoomType",
    "tblLookupSalutation",
    "tblLookupShuttleSite",
    "tblLookupTaxRateType",
    "tblLookupTransactionType",
    "tblLookupUser",
    "tblExchangeRate",
    "tblTaxRate",
    "tblRoom",
    "tblRoomRate",
    "tblRoomRateNEW",
    "tblInventory",
    "tblInventoryExcel",
    "tblPaymentTypeZero",
    "tblPaymentZero",
    "tblInventoryRate",
    "tblInventoryRate2",
    "tblCalcTaxRateFilter",
    "tblCalcTaxRateFilter2",
    "tblChooseRoomRate",
    "tblChooseRoomRate2",
    "tblInventoryTax",
    "tblInventoryTax2",
)

# All SERIAL columns in the renamed PostgreSQL schema. Some Access helper tables
# do not define primary keys but still use SERIAL columns and need sequence reset.
SERIAL_COLUMNS: tuple[tuple[str, str], ...] = (
    ("application_registration", "registrationid"),
    ("application_specifications", "specid"),
    ("application_versions", "versionid"),
    ("exchange_rates", "exchangerateid"),
    ("guests", "guestid"),
    ("housekeeping_notes", "housekeepingnotesid"),
    ("housekeeping_notes_backup", "housekeepingnotesid"),
    ("inventory_items", "inventoryid"),
    ("kitchen_meals", "kitchenmealid"),
    ("kitchen_meals_new", "kitchenmealid"),
    ("lookup_users", "userid"),
    ("room_assignments", "occupancyid"),
    ("room_assignments_backup", "occupancyid"),
    ("payments", "paymentid"),
    ("payments_backup", "paymentid"),
    ("reservations", "reservationid"),
    ("reservations_backup", "reservationid"),
    ("reservation_guests", "reservationguestid"),
    ("reservation_guests_backup", "reservationguestid"),
    ("rooms", "roomid"),
    ("room_rates", "roomrateid"),
    ("room_rates_new", "roomrateid"),
    ("shuttles", "shuttletripid"),
    ("tax_rates", "taxrateid"),
    ("transactions", "transactionid"),
    ("transactions_backup", "transactionid"),
    ("calc_tax_rate_filters", "taxrateid"),
)


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
        for source_schema in (TARGET_SCHEMA, "legacy-db"):
            rewritten = rewritten.replace(
                f'"{source_schema}"."{access_name}"',
                f'"{TARGET_SCHEMA}"."{postgres_name}"',
            )
            rewritten = rewritten.replace(
                f"{source_schema}.{access_name}",
                f"{TARGET_SCHEMA}.{postgres_name}",
            )
    return rewritten


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
