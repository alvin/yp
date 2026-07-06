# id: uvJQbadKRqkzLJxAqh0E
@persona:operations-lead @status:done @priority:4 @kitchen @filtered-report @dates
Feature: show departure date in kitchen report rows

  As Operations lead
  I want to show departure date in kitchen report rows
  So that so that they can quickly confirm departure timing context

  Background:
    Given when kitchen staff review meal report entries

  Scenario: Acceptance criteria
    Then Departure date appears on the filtered kitchen report for each listed stay.
    And The date is readable in a standard date format.
    And Staff can distinguish departures from arrivals without confusion.
    And No departure date is replaced by an unclear stay summary.
