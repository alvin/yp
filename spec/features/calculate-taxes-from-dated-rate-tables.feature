@persona:operations-lead @persona:front-desk-supervisor @status:done @priority:5 @business-logic @taxes @rates
Feature: calculate taxes from dated rate tables

  As Operations lead, Front-desk supervisor
  I want to calculate taxes from dated rate tables
  So that every charge carries the correct tax breakdown for its transaction date

  Background:
    Given a charge line is saved for a room or an inventory item

  Scenario: Acceptance criteria
    Then Each tax column is computed from the room or item tax flags and the rate effective on the transaction date.
    And A tax whose flag is off for the room or item stays at zero.
    And Editing the amount, date, item, or room recomputes the taxes.
    And Tax amounts supplied by the legacy import are preserved as stored.
