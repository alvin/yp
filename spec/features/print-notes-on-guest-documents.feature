@persona:front-desk-supervisor @persona:printing-coordinator @status:done @priority:4 @documents @confirmation @check-in @folio @cancellation
Feature: print notes on guest documents

  As Front-desk supervisor, Printing coordinator
  I want each guest document to print the notes meant for the guest
  So that a party can catch a mistake when the confirmation arrives, and confirm their requests again when they sign in

  Background:
    Given a stay has notes on file

  Scenario: Acceptance criteria
    Then The confirmation prints the diet, the housekeeping note and the requests, and the occupancy notes under the rooms, as Access printed them.
    And The check-in folio prints the same diet and housekeeping note.
    And The cancellation notice prints the occupancy notes.
    And The note typed when cancelling joins the office-only reservation notes, never the occupancy notes, so it prints on no guest document and not on the In House report.
    And The diet reads as on the kitchen report, and the housekeeping note as on the housekeeping report: only the latest one, where it has been revised.
    And A stay with several rooms prints each different occupancy note once, in room order.
    And A stay with none of these notes prints no note lines.
