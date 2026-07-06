# id: mySPycjPDi7h1Feg8nOf
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @search @overlap @mode
Feature: support occupancy overlap mode

  As Reservation clerk, Front-desk supervisor
  I want to support occupancy overlap mode
  So that they can find stays that overlap the chosen date

  Background:
    Given when the selected search mode is occupancy overlap

  Scenario: Acceptance criteria
    Then The search returns stays that overlap the selected date.
    And The result list reflects overlap matching rather than a single-point stay date.
    And Each returned row is identified as an overlap match.
