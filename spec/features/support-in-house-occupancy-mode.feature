# id: lOrzL5MwZra6b56tCEeF
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @search @occupancy @mode
Feature: support in-house occupancy mode

  As Reservation clerk, Front-desk supervisor
  I want to support in-house occupancy mode
  So that they can review guests who are staying on the chosen date

  Background:
    Given the selected search mode is In house

  Scenario: Acceptance criteria
    Then The search returns every stay holding a room on the selected date, including stays arriving or departing that day.
    And The result list reflects in-house occupancy mode rather than arrival or departure mode.
    And Each stay is shown as an arrival, a departure, or in house, by what it does on that day.
    And A room that has been removed from a stay no longer counts.
