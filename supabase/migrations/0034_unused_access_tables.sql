-- =============================================================================
-- 0034_unused_access_tables.sql
-- Only the Access tables the system uses.
-- =============================================================================
-- 0002 gave every table in the Access file a table here. The ones below are
-- read by nothing in the system: no screen, report, view, function or rule.
-- They are Access's own settings and user list, its helper and scratch tables,
-- lookups the new screens don't offer, tables from old rate and price loads,
-- the empty shuttle log, and the BACKUP copies Access kept of the live tables
-- (their bookings are nearly all still in the live tables).
--
-- The import and the seed leave them in the Access file
-- (supabase/tools/access_table_map.py: LEFT_IN_ACCESS). No view or function
-- refers to them, and only they refer to one another, so they are dropped
-- together, without cascade: anything else that came to depend on one would
-- stop this migration rather than be dropped with it.
-- =============================================================================

drop table if exists
  -- Access's own settings and its compact-error log
  ypl.application_information,
  ypl.application_information_from_back,
  ypl.application_objects,
  ypl.application_registration,
  ypl.application_specifications,
  ypl.application_versions,
  ypl.access_compact_errors,
  -- Access's user list: staff names and initials
  ypl.lookup_users,
  -- lookups the new screens don't offer
  ypl.lookup_cities,
  ypl.lookup_countries,
  ypl.lookup_regions,
  ypl.lookup_guest_diets,
  ypl.lookup_shuttle_sites,
  ypl.lookup_payment_codes,
  ypl.lookup_inventory_codes,
  -- Access's backup copies of the live tables
  ypl.housekeeping_notes_backup,
  ypl.room_assignments_backup,
  ypl.payments_backup,
  ypl.reservations_backup,
  ypl.reservation_guests_backup,
  ypl.transactions_backup,
  -- helper and scratch tables Access's forms and reports used
  ypl.mailouts,
  ypl.reservation_board,
  ypl.kitchen_meals_new,
  ypl.payment_type_zero,
  ypl.payment_zero,
  ypl.inventory_rates,
  ypl.inventory_rates_2,
  ypl.inventory_taxes,
  ypl.inventory_taxes_2,
  ypl.calc_tax_rate_filters,
  ypl.calc_tax_rate_filters_2,
  ypl.choose_room_rates,
  ypl.choose_room_rates_2,
  -- tables from old rate and price loads, and the shuttle log (empty)
  ypl.room_rates_new,
  ypl.inventory_excel_import,
  ypl.shuttles;
