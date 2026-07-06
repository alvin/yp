# id: FJvrFwzfldhGee4OO3fD
@persona:printing-coordinator @persona:front-desk-supervisor @persona:reservation-clerk @status:done @priority:5 @documents @checkout-bill
Feature: show itemized charges, tax lines, payments, and balance on the check-out bill

  As Printing coordinator, Front-desk supervisor, Reservation clerk
  I want to show itemized charges, tax lines, payments, and balance on the check-out bill
  So that so the bill presents a complete breakdown with taxes, payments, and the final balance

  Background:
    Given a check-out bill is printed for a departing guest

  Scenario: Acceptance criteria
    Then The bill includes itemized charges from the reservation’s charge entries
    And The bill includes tax lines where taxes apply
    And The bill includes payments and deposits and shows a final balance
