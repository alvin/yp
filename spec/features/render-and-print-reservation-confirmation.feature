@persona:printing-coordinator @persona:front-desk-supervisor @status:done @priority:2 @printing @confirmation @documents
Feature: render and print reservation confirmation

  As Printing coordinator, Front-desk supervisor
  I want to render and print reservation confirmation
  So that reservation confirmations are produced in the established format

  Background:
    Given confirmations are queued for printing in the Print Center

  Scenario: Acceptance criteria
    Then The slip shows the guest's name and mailing address, the reservation number, the date it was confirmed and the date it was printed.
    And The slip shows the arrival and departure, each room with its in and out dates and number of guests, and the deposit received.
    And The check-in folio and the check-out bill carry the reservation number and the date printed too.
    And The slip prints from its own screen, and closes with the lodge's phone number.
