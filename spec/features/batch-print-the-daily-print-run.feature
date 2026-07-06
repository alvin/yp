@persona:printing-coordinator @persona:front-desk-supervisor @status:done @priority:4 @printing @batch @workflow
Feature: batch print the daily print run

  As Printing coordinator, Front-desk supervisor
  I want to batch print the daily print run
  So that tomorrow's reports and guest documents print in one go

  Background:
    Given the print centre is open for a chosen business date

  Scenario: Acceptance criteria
    Then A batch action gathers the day's operational reports and queued guest documents together.
    And The batch shows how many pages are ready, broken down by type.
    And One print action prints the whole set, each item on its own page.
    And A document that fails to load is skipped without losing the rest of the batch.
