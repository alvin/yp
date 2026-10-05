-- =============================================================================
-- 0020_no_ics_crossover.sql
-- "ICS Crossover" came over from Access's payment-type list and was used once
-- (a deposit refund on #100084, Sept 2024). The lodge asked for it to go.
--
-- The list is what the payment pickers offer and what lines the Daily Cash
-- report prints on every day. The one payment keeps its type: the report still
-- gives it its own line on the day it was taken, after the listed types
-- (report_dcar_payments, 0014), so that day's lines still add up.
-- =============================================================================

set search_path = ypl, public;

delete from ypl.lookup_payment_types where paymenttype = 'ICS Crossover';
