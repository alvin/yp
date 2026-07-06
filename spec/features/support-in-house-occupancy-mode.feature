# id: lOrzL5MwZra6b56tCEeF
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @search @occupancy @mode
Feature: support in-house occupancy mode

  As Reservation clerk, Front-desk supervisor
  I want to support in-house occupancy mode
  So that they can review guests who are staying on the chosen date

  Background:
    Given when the selected search mode is in-house occupancy

  Scenario: Acceptance criteria
    Then The search returns stays occupied on the selected date.
    And The result list reflects in-house occupancy mode rather than arrival or departure mode.
    And Each returned row is identified as an in-house occupancy match.
