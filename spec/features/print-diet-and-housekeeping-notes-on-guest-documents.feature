@persona:front-desk-supervisor @persona:printing-coordinator @status:done @priority:4 @documents @confirmation @check-in @folio
Feature: print diet and housekeeping notes on guest documents

  As Front-desk supervisor, Printing coordinator
  I want to print the diet and housekeeping notes on the confirmation and the check-in folio
  So that a party can catch a mistake when the confirmation arrives, and confirm their requests again when they sign in

  Background:
    Given a stay has a diet and a housekeeping note on file

  Scenario: Acceptance criteria
    Then The confirmation shows the diet the kitchen holds for the party, in the kitchen report's wording.
    And The confirmation shows the housekeeping note, as the housekeeping report prints it.
    And The check-in folio shows the same diet and housekeeping note.
    And Where a housekeeping note has been revised, only the latest one prints, as on the housekeeping report.
    And A stay with neither note prints as it did before.
