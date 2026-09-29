# id: pdmWwyjIrI1ZTERZggwL
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @search @results @matching
Feature: show date match type

  As Reservation clerk, Front-desk supervisor
  I want to show date match type
  So that they can quickly tell why each stay appears in the list

  Background:
    Given reservation staff review date-based search results

  Scenario: Acceptance criteria
    Then Every result shows whether the stay matches as an arrival, a departure, or an in-house stay: by the heading it sits under, or by its own label where the list holds one kind.
    And The match type is visible without opening the reservation.
    And The match type corresponds to the reason the stay was returned in the search.
    And A list holding more than one kind of match is broken into a section per kind, each under its own heading, in the order the day runs.
    And A row under a heading is not labelled with its kind a second time.
    And A list of a single kind is not broken into sections; each row carries its own label instead.
