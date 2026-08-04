@persona:reservation-clerk @persona:operations-lead @status:done @priority:4 @business-logic @notes @migration
Feature: store notes as plain text

  As Reservation clerk, Operations lead
  I want to store notes as plain text
  So that the lodge's note history reads cleanly on screen and on printed reports

  Background:
    Given notes carried over from the old system were saved as formatted text

  Scenario: Acceptance criteria
    Then Notes are stored and shown as plain lines, without the old formatting markup.
    And Each note line from the old system is kept, in its original order and wording.
    And Notes written or pasted later are stored as plain text too, however they are entered.
    And Ordinary punctuation such as an ampersand is left untouched.
