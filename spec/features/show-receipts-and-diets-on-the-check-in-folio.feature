@persona:front-desk-supervisor @persona:printing-coordinator @status:done @priority:4 @documents @check-in @folio
Feature: show receipts and diets on the check-in folio

  As Front-desk supervisor, Printing coordinator
  I want to show receipts and diets on the check-in folio
  So that everything the desk confirms with an arriving party is on the slip in front of them

  Background:
    Given a party arrives and the folio for their stay is printed

  Scenario: Acceptance criteria
    Then The folio lists every receipt already held against the stay, not the deposit alone.
    And A prepayment or a gift certificate taken for the stay appears beside the deposit, named as what it is.
    And The folio shows the diet the kitchen holds for the party.
    And A stay with only a deposit and no diet prints as it did before.
