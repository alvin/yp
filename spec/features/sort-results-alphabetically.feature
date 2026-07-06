# id: 58e93KoT0udGed14JH6Z
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @search @sorting @results
Feature: sort results alphabetically

  As Reservation clerk, Front-desk supervisor
  I want to sort results alphabetically
  So that they can find guests faster in a predictable order

  Background:
    Given when reservation staff review date-based search results

  Scenario: Acceptance criteria
    Then Results are ordered alphabetically by guest last name.
    And The ordering is consistent for the same search conditions.
    And Names with the same last name remain grouped together in the list.
