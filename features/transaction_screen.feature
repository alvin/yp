Feature: Transaction Screen
  The transaction screen is the main reservation workspace for Access-compatible
  guest details, stay details, room occupancy, charge/payment rows, report notes,
  and reservation actions.

  Background:
    Given reservation headers are stored in `ypl.reservations`
    And guest-to-reservation links are stored in `ypl.reservation_guests`
    And room assignments and room moves are stored in `ypl.room_assignments`
    And charge lines are stored in `ypl.transactions`
    And deposits, prepayments, payments, refunds, A/R, gift certificates, and gratuities are stored in `ypl.payments`
    And housekeeping notes are stored in `ypl.housekeeping_notes`
    And kitchen/meal notes are stored in `ypl.kitchen_meals` by `guestid`

  Scenario: View the selected guest and reservation on the transaction screen
    Given a reservation has been opened from search results or reservation number lookup
    When the transaction screen is shown
    Then the user sees guest information from `ypl.guests` and `ypl.reservation_guests`
    And the user sees reservation information from `ypl.reservations`
    And the user sees occupancy rows from `ypl.room_assignments`
    And the user sees charge rows from `ypl.transactions`
    And the user sees payment rows from `ypl.payments`

  Scenario: Create a new reservation from a blank transaction screen
    Given the user selected New Reservation from the lookup screen
    When the blank transaction screen is shown
    Then the user can enter guest information
    And the user can enter reservation information for the new stay
    And saving creates Access-compatible rows without introducing non-production storage tables

  Scenario: Create a future reservation within the one-year booking window
    Given the user is entering a future reservation
    When the reservation dates fall within one year in advance
    Then the reservation can be stored for that stay
    And `ypl.reservations.resarrivaldate` and `ypl.reservations.resdeparturedate` are populated

  Scenario: Reject a reservation that is more than one year ahead
    Given the user is entering a future reservation
    When the reservation dates fall more than one year in advance
    Then the reservation cannot be stored for that stay in the new UI
    And the user is told that the lodge stores reservations only one year ahead
    And already-migrated historical imported rows are preserved even if their dates do not match the new-entry policy

  Scenario: Record multiple guest names and shared-room occupancy on one reservation
    Given the transaction screen is shown for a reservation
    When multiple named guests share that stay
    Then the reservation can include multiple `ypl.reservation_guests` rows for the same `ypl.reservations` row
    And each linked guest can retain their own `ypl.guests` record
    And shared-room or couple occupancy can be represented through `ypl.room_assignments` and `ypl.reservation_guests.percentageofbill`

  Scenario: Review room-selection help while assigning a room
    Given the transaction screen is shown for a reservation
    When the user selects a room for the stay
    Then the room pull-down includes room type and a brief bed-layout description for staff
    And the description can come from `ypl.rooms.roomtype`, `ypl.rooms.roomshorthand`, and `ypl.rooms.roomnotes`
    And additional room context can remain available from `ypl.rooms.roomname`, `ypl.rooms.roomnumber`, `ypl.rooms.roomcode`, and tax flags where useful

  Scenario: Record room moves during a guest stay
    Given the transaction screen is shown for a reservation
    When the guest moves rooms during the stay
    Then the reservation records another `ypl.room_assignments` row with its own room, in date, out date, count, and notes
    And the prior occupancy row remains available for history and reporting

  Scenario: Keep guest notes available for office use only
    Given the transaction screen is shown
    When the user selects Guest Notes
    Then the user can review `ypl.guests.guestnotes` for office use
    And those guest notes do not print to reports

  Scenario: Record dietary, housekeeping, and request notes for the stay
    Given the transaction screen is shown
    When the user records report-facing notes
    Then dietary and allergy details can be stored in `ypl.kitchen_meals` for the guest
    And housekeeping instructions can be stored in `ypl.housekeeping_notes` for the reservation guest
    And in-house occupancy/request wording can be stored in `ypl.reservation_guests.rgnotes` or `ypl.room_assignments.occupancynotes`
    And general reservation wording can be stored in `ypl.reservations.resnotes`

  Scenario: Support one-bill and split-bill arrangements on a reservation
    Given the transaction screen is shown for a reservation
    When the stay requires a one-bill or split-bill arrangement
    Then the reservation workflow can use `ypl.reservation_guests.percentageofbill` and separate `ypl.payments` or `ypl.transactions` rows per reservation guest
    And staff-entered one-bill wording can remain in Access-derived note fields for reports

  Scenario: Post deposits and payments to the reservation ledger
    Given the transaction screen is shown
    When the user records a deposit or payment for the reservation
    Then a `ypl.payments` row is created with the selected `paymentcode`, `paymentcategory`, `paymenttype`, `paymentdate`, amount, currency, and Canadian-dollar amount
    And the screen can display deposits and payments as negative balance effects even though Access stores most receipt amounts as positive values

  Scenario: Select a tender type when recording a payment
    Given the transaction screen is shown
    When the user records a payment
    Then the user can choose a payment type from `ypl.lookup_payment_types`

  Scenario: Record a payment taken in US funds converted to Canadian dollars
    Given the transaction screen is shown
    When the user records a payment received in US funds
    Then `ypl.payments.paymentcurrency` stores the original currency label
    And `ypl.payments.paymentamount` stores the tender amount
    And `ypl.payments.paymentamountcdn` stores the converted Canadian-dollar value used by reports
    And exchange-rate values can be referenced from `ypl.exchange_rates`

  Scenario: Preserve complete old payment fields during the local import
    Given production data is imported with `supabase/tools/export_access_data.py`
    When imported payment rows include `ccname`, `ccnumber`, `ccexpdate`, or `ccnotes`
    Then those values are retained in `ypl.payments` and `ypl.payments_backup` for the air-gapped local deployment
    And normal UI and report reads use app-facing `ypl` views, which do not surface card number or expiry fields by default

  Scenario: Distinguish a prepayment from a deposit
    Given the transaction screen is shown
    When the reservation holds funds in advance of the stay
    Then deposits use payment categories such as Deposit (Received), Deposit (Applied), Deposit (Refund), and Deposit (Kept)
    And prepayments remain separate using Prepayment (Received), Prepayment (Applied), and Prepayment (Refund)

  Scenario: Post room-night charges and incidental extras to the reservation ledger
    Given the transaction screen is shown
    When the user records room nights or extras for the reservation
    Then those charges are stored in `ypl.transactions`
    And the charge row carries `transtype`, `inventoryid` or `roomid` where applicable, quantity, amount, tax amounts, notes, and occupancy dates

  Scenario: Select coded charge items with date and quantity from a pull-down
    Given the transaction screen is shown
    When the user adds a charge line
    Then the charge item can be chosen from `ypl.inventory_items` or `ypl.room_rates` as applicable
    And the user can enter the date for `ypl.transactions.transdate`
    And the user can enter `ypl.transactions.transquantity`
    And the line carries inventory, room, transaction-type, and tax fields that feed reporting

  Scenario: Sell a gift certificate on a reservation
    Given the transaction screen is shown
    When the user sells a gift certificate
    Then the gift certificate sale appears as a `ypl.transactions` row with `transtype` Gift Certificate or a matching inventory item
    And gift certificate tender received can be represented in `ypl.payments` using Gift Certificate Received
    And both sides can feed the daily cash reporting flow

  Scenario: Record a gratuity on a reservation
    Given the transaction screen is shown
    When the user records a gratuity
    Then the gratuity is represented with the `ypl.payments` category Gratuity

  Scenario: Override the price on a transaction line
    Given the transaction screen is shown
    When the user enters a transaction line with an overridden price
    Then `ypl.transactions.transamount` stores the entered amount for historical accuracy
    And later changes to `ypl.inventory_items.invamount` or `ypl.room_rates.roomrate` do not rewrite the historical transaction

  Scenario: Review subtotal and balance owing for the reservation
    Given the transaction screen is shown
    When charges, deposits, and payments have been entered
    Then the user can review the subtotal from `ypl.transactions` amounts and taxes
    And the user can review the balance owing from transaction totals less payment balance effects

  Scenario: Re-book a guest from an existing reservation
    Given the transaction screen is shown for an existing reservation
    When the user selects Re-Book
    Then another transaction screen is opened with guest information carried forward
    And the new stay receives new `ypl.reservations`, `ypl.reservation_guests`, and `ypl.room_assignments` rows
    And prior `ypl.transactions` and `ypl.payments` rows are not copied unless staff explicitly enter or transfer them

  Scenario: Cancel a reservation and record deposit transfer or refund handling
    Given the transaction screen is shown for a reservation
    When the user selects Cancel
    Then `ypl.reservations.rescancelled` is set and `ypl.reservations.resdatecancelled` is recorded
    And deposit refund, transfer, applied, or kept handling is recorded with the appropriate `ypl.payments` category or code
    And the cancellation output can read both the reservation cancellation fields and the payment outcome fields

  Scenario: Keep a deposit on cancellation
    Given the transaction screen is shown for a reservation being cancelled
    When the lodge keeps the deposit rather than refunding or transferring it
    Then a `ypl.payments` row with `paymentcategory` Deposit (Kept) can be recorded
    And the kept deposit can appear on the cancellation output and DCAR flow

  Scenario: Print reservation-specific documents from the transaction screen
    Given the transaction screen is shown
    When the user prints from the reservation context
    Then the user can print a confirmation
    And the user can print a folio
    And the user can print a single bill
    And the user can print a cancellation notice
    And the reports are generated from Access-compatible rows through the `ypl` report RPCs

  Scenario: Capture date and type detail on transaction lines
    Given the transaction screen is shown
    When transaction lines are entered
    Then each `ypl.transactions` row stores `transdate` and `transtype`
    And each `ypl.payments` row stores `paymentdate`, `paymentcode`, `paymentcategory`, and `paymenttype`
