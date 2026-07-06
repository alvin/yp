Feature: Printed Outputs
  The printed outputs preserve the lodge's current guest documents and daily
  operational reports while staying close to the wording, data sources, and layout
  staff use today in the Access system.

  Background:
    Given printed outputs are generated from the production Supabase schema
    And guest/contact data comes from `ypl.guests` and `ypl.reservation_guests`
    And reservation dates, confirmation, cancellation, and notes come from `ypl.reservations`
    And rooms and room moves come from `ypl.room_assignments` joined to `ypl.rooms`
    And charge lines come from `ypl.transactions` joined to `ypl.inventory_items` or `ypl.room_rates` where applicable
    And payments, deposits, refunds, and A/R lines come from `ypl.payments` and the payment lookup tables

  Scenario: Preserve guest and reservation details on guest documents
    Given a guest-facing document is printed
    When the output is produced
    Then it includes the guest and contact block
    And it includes the reservation number and printed date
    And it includes the arrival, departure, room, in-date, out-date, and guest-count details
    And the fields remain traceable to `ypl.guests`, `ypl.reservations`, `ypl.reservation_guests`, `ypl.room_assignments`, and `ypl.rooms`

  Scenario: Show the confirmed date and deposit received on the reservation confirmation slip
    Given a reservation confirmation slip is printed
    When the reservation has been confirmed and a deposit has been taken
    Then the slip includes `ypl.reservations.resdateconfirmed`
    And the slip includes the deposit received line from `ypl.payments.paymentcategory` Deposit (Received)

  Scenario: Include deposit, vehicle, and signature detail on the check-in folio
    Given a check-in folio is printed
    When the guest is arriving for the stay
    Then the folio includes deposit detail where applicable
    And the folio includes vehicle detail from `ypl.reservation_guests.vehicledescription` and `ypl.reservation_guests.vehiclelicenseplate`
    And the folio includes the signature field

  Scenario: Show itemized charges, taxes, payments, and balance on the check-out bill
    Given a check-out bill is printed
    When the guest is departing
    Then the bill includes itemized charges from `ypl.transactions`
    And the bill includes tax lines from `ypl.transactions` tax amount fields
    And the bill includes payments and deposits from `ypl.payments`
    And the bill includes the final balance

  Scenario: Keep payment lines and deposit-application lines separate on the check-out bill
    Given a check-out bill is printed
    When the reservation includes both a final payment and a deposit application
    Then the bill shows the Payment (Regular) line separately from the Deposit (Applied) line
    And those lines remain separately printed even when the balance reaches zero

  Scenario: Include closing balance fields on the check-out bill
    Given a check-out bill is printed
    When the bill is produced
    Then the bill includes a future deposit field
    And the bill includes a gratuity field
    And the bill includes a final total field
    And the bill includes the GST registration number

  Scenario: Preserve the tax breakdown lines on the check-out bill
    Given a check-out bill is printed
    When taxes apply to the charges
    Then the bill can show GST, PST, HST, Liquor Tax, Room Tax, Hotel Tax, and Destination Marketing Tax lines
    And the bill shows a subtotal that includes those taxes

  Scenario: Preserve the cancelled date and deposit outcome on the cancellation notice
    Given a cancellation notice is printed
    When a reservation has been cancelled
    Then the notice includes the printed date and `ypl.reservations.resdatecancelled`
    And the notice includes arrival, departure, room, and guest-count details
    And the notice includes printed cancellation notes from `ypl.reservations.resnotes` where applicable
    And the notice includes deposit receipt, refund, transfer, applied, or kept-detail where applicable from `ypl.payments`

  Scenario: Print a reservation-specific message on the confirmation slip
    Given a reservation confirmation slip is printed
    When the reservation carries a guest-facing message
    Then the confirmation includes the reservation-specific message from `ypl.reservations.resnotes` where applicable

  Scenario: Keep guest notes off printed outputs
    Given printed outputs are produced from reservation and guest data
    When `ypl.guests.guestnotes` exist for office use
    Then those guest notes do not appear on printed outputs

  Scenario: Preserve statuses, row detail, and housekeeping notes on the housekeeping report
    Given a housekeeping report is printed
    When room operations are reviewed for the selected day
    Then the report includes statuses such as Arrive Today, Depart Today, In House, and Move In
    And each row can include reservation number, guest, occupancy count, room, and in or out dates
    And the report includes note dates from `ypl.housekeeping_notes.hknotesdate` where they are shown
    And the report includes reservation-specific housekeeping instructions from `ypl.housekeeping_notes.housekeepingnotes`

  Scenario: Preserve groupings, counts, and multi-room handling on the in-house report
    Given an in-house report is printed
    When current occupancy is reviewed for the selected day
    Then the report groups reservations into Arrive Today, Depart Today, Move In, and In House sections
    And the report includes section counts and total guests
    And the report can represent a single reservation across multiple `ypl.room_assignments` room or occupancy lines
    And the report includes occupancy notes from `ypl.room_assignments.occupancynotes` and `ypl.reservation_guests.rgnotes` where they apply

  Scenario: Preserve dietary and guest-specific wording on kitchen reporting
    Given kitchen reporting is printed
    When reservations include dietary restrictions, allergies, or meal preferences
    Then the report includes those dietary and allergy details from `ypl.kitchen_meals`
    And the report keeps guest-specific wording within multi-name reservations by joining through `ypl.reservation_guests`
    And the report preserves staff-entered wording closely because kitchen staff rely on the specific language

  Scenario: Preserve the filtered kitchen report mode
    Given kitchen reporting is printed
    When staff choose a narrower kitchen report for an explicit date or date range
    Then the same guest diet and kitchen meal note data can be shown in a compact filtered report
    And the filtered report includes reservation number, guest name, diet notes, kitchen notes, arrival date, and departure date

  Scenario: Preserve room order and cancelled-reservation handling on the manual sales list
    Given the manual sales list is printed
    When daily room-based sales or charges are reviewed
    Then the report includes room-based occupancy detail from `ypl.room_assignments` and `ypl.rooms`
    And the report preserves `ypl.rooms.roomorder` sequencing
    And the report preserves the cancelled-reservation checkbox convention
    And cancelled reservations can be filtered out of the report using `ypl.reservations.rescancelled`

  Scenario: Preserve printed report metadata and footer wording
    Given printed outputs are produced
    When a guest document or operations report is printed
    Then the output can include the lodge name and phone number where shown on the current form
    And reports can include generated date/time and page numbering where shown on the current samples
    And confirmation and cancellation documents preserve office-hours and guest-facing closing wording where applicable

  Scenario: Produce standard reports and folios at their established paper sizes
    Given printed outputs are produced
    When a daily operations report is printed
    Then the report uses the standard 8.5 by 11 inch page
    And a folio or confirmation can use the smaller A2-style folio page
