Feature: Name Search Results
  The name search results screen shows guest information from `ypl.guests`
  and that guest's reservation history through `ypl.reservation_guests` and
  `ypl.reservations` so staff can open the correct stay.

  Background:
    Given the guest record comes from `ypl.guests`
    And reservation history is linked through `ypl.reservation_guests`
    And room history is linked through `ypl.room_assignments`
    And screen-only guest notes are stored in `ypl.guests.guestnotes`

  Scenario: View guest details for a selected name search match
    Given a guest name search has returned a matching guest
    When the name search results screen is shown
    Then the user sees the guest name
    And the user sees the guest number from `ypl.guests.guestid`
    And the user sees the guest address information from `ypl.guests.guestaddress`
    And the user sees the guest city, province, and country
    And the user sees the guest primary and secondary phone information where stored
    And the user sees the guest email information

  Scenario: Review reservation history in the original three-section layout
    Given the name search results screen is shown
    When the user reviews the guest's reservation history view
    Then the reservation history is split into Future Reservations, Present Reservation (In-House), and Past Reservations sections
    And future and past rows show arrival date and room where available
    And the present section identifies the in-house stay when one exists

  Scenario: Review future reservations for the selected guest
    Given the name search results screen is shown
    When the user reviews the guest's reservation history view
    Then the user can review upcoming reservations for that guest
    And each reservation can show an arrival date and room from `ypl.reservations` and `ypl.room_assignments`

  Scenario: Review the guest's current in-house reservation
    Given the name search results screen is shown
    When the guest has a current stay
    Then the user can review that in-house reservation on the screen
    And the stay can be identified by `ypl.room_assignments` date ranges or `ypl.reservation_guests.guestinhouse`

  Scenario: Review past reservations for the selected guest
    Given the name search results screen is shown
    When the user reviews the guest's reservation history view
    Then the user can review previous reservations for that guest

  Scenario: Keep older reservations available within the guest history workflow
    Given the name search results screen is shown
    When the guest has reservations older than one year
    Then those older stays remain reviewable in the guest history workflow
    And the office does not need a separate archive workflow to look them up in the new UI
    And archived imported rows remain in the Access-compatible schema for migration completeness

  Scenario: Open a selected reservation from the guest history view
    Given the name search results screen is shown
    When the user selects a reservation from the guest history view
    Then the reservation workflow for that stay is opened
    And the workflow opens the full transaction screen backed by the selected `ypl.reservations` row

  Scenario: Open guest notes from the name search results screen
    Given the name search results screen is shown
    When the user selects Guest Notes
    Then the user can review guest-level notes from `ypl.guests.guestnotes`
    And those guest notes are for on-screen office use
    And those guest notes do not print to reports

  Scenario: View a guest record that includes multiple named occupants
    Given the name search results screen is shown
    When the selected guest participates in reservations with multiple `ypl.reservation_guests` rows
    Then the guest information can represent those multiple names on the guest side of the workflow
    And the reservation history can still open the shared `ypl.reservations` record
