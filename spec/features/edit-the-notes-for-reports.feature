@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @reports @notes @reservation
Feature: edit the notes for reports

  As Reservation clerk, Front-desk supervisor
  I want each note on a stay kept where the report that needs it reads it
  So that the kitchen, housekeeping and the front desk each get the wording meant for them

  Background:
    Given a reservation is open on the reservation screen

  Scenario: Acceptance criteria
    Then Notes for reports has a tab each for Kitchen, Housekeeping, Requests and Occupancy.
    And The kitchen notes print on the kitchen report, the housekeeping note on the housekeeping report, the occupancy notes on the In House report, and the requests on the Requests reports, not the In House report.
    And Each room of the stay has its own occupancy notes; a stay with more than one room shows a box for each, named by the room and its dates.
    And What's in a box is what prints: saving changes only that note, and emptying it and saving clears it so it no longer prints.
    And The diet notes show as they print, a diet type recorded in Access included; saving them again revises the same diet rather than filing a second.
    And The housekeeping tab edits the note in force: saving it unchanged adds nothing, and earlier housekeeping notes stay on record when it is changed or cleared.
