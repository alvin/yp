# id: pdmWwyjIrI1ZTERZggwL
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @search @results @matching
Feature: show date match type

  As Reservation clerk, Front-desk supervisor
  I want to show date match type
  So that they can quickly tell why each stay appears in the list

  Background:
    Given when reservation staff review date-based search results

  Scenario: Acceptance criteria
    Then Each result row shows whether the stay matches as an arrival, departure, or in-house occupancy.
    And The match type is visible without opening the reservation.
    And The match type corresponds to the reason the stay was returned in the search.
