# id: mGwWt8WOmuplauu73hIQ
@persona:operations-lead @status:done @priority:4 @kitchen @filtered-report @dates
Feature: show arrival date in kitchen report rows

  As Operations lead
  I want to show arrival date in kitchen report rows
  So that so that they can quickly confirm stay timing context

  Background:
    Given when kitchen staff review meal report entries

  Scenario: Acceptance criteria
    Then Arrival date appears on the filtered kitchen report for each listed stay.
    And The date is readable in a standard date format.
    And Staff can distinguish arrivals from departures without confusion.
    And No arrival date is replaced by an unclear stay summary.
