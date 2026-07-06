# id: UwkPmXw5BlcxItZvVvjP
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @search @room @results
Feature: show room

  As Reservation clerk, Front-desk supervisor
  I want to show room
  So that they can see room assignment at a glance

  Background:
    Given when reservation staff review date-based search results

  Scenario: Acceptance criteria
    Then Each result row shows the room number or room identifier.
    And The room is visible without opening the reservation.
    And Rows without an assigned room clearly indicate that no room is assigned.
