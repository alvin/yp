# Changeset — Next Year's Deposits report (round 9)

**Date:** 2026-09-29
**Trigger:** the lodge asked for a yearly total of deposits received, Jan 1 to
Dec 31, for their year end; the owner asked for it as a report, by month.

**Shipped.** `0018_next_years_deposits.sql` — `report_next_years_deposits(p_year)`:
for each month of the year, the deposits received (the Deposits Received
appendix's category) on reservations arriving after Dec 31, how much of those
was refunded or kept within the year, and what is still held. The $0.00
deposit lines Access added to new bookings aren't counted as deposits. Report
page `/reports/next-years-deposits?year=`, opened from the Print Center's new
Year end card, with a year picker. Story `print-next-years-deposits.feature`.

**Judgement call — "next year's" means stays after the chosen year.** A year
end needs the money taken during the year for stays not yet had; deposits for
stays within the year are ordinary revenue by then. If the lodge wants every
deposit received in the year, drop the arrival condition.

**To back out:** drop the function, the route and the Print Center card.
