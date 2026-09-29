@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @search @overlap @mode
Feature: support occupancy overlap mode

  As Reservation clerk, Front-desk supervisor
  I want to support occupancy overlap mode
  So that they can find stays that overlap the chosen dates

  Background:
    Given a date range is searched in Both mode

  Scenario: Acceptance criteria
    Then The search returns every stay whose dates overlap the range, even one that arrives before it and leaves after it.
    And The result list reflects overlap matching rather than a single-point stay date.
    And Each returned row is labelled Overlapping.
    And A range searched in In house or Occupancy mode matches on the rooms held, and labels each row In house.
