# id: MmiYw77XtsWtKpQ3cZ1T
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @ledger @guests @allocation
Feature: assign ledger responsibility

  As Reservation clerk, Front-desk supervisor
  I want to assign ledger responsibility
  So that the clerk can direct each entry to the right guest so settlement and reporting stay accurate

  Background:
    Given when charges and payments must be attributed across more than one reservation guest

  Scenario: Acceptance criteria
    Then The transaction screen allows a charge or payment to be assigned to a specific reservation guest.
    And The assigned guest remains associated with the entry after saving.
    And The reservation balance and guest activity views reflect the chosen responsibility.
    And Printed daily activity supports reviewing who was responsible for each entry.
