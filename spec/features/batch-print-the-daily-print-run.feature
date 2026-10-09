@persona:printing-coordinator @persona:front-desk-supervisor @status:done @priority:4 @printing @batch @workflow @paper-sizes
Feature: batch print the daily print run

  As Printing coordinator, Front-desk supervisor
  I want to batch print the daily print run
  So that tomorrow's reports and guest documents print in one go, each on the right paper

  Background:
    Given the print centre is open for a chosen business date

  Scenario: Acceptance criteria
    Then A batch action gathers the day's operational reports and queued guest documents together: confirmations, check-in folios, check-out bills and cancellation notices.
    And The batch shows how many pages are ready, broken down by type.
    And The daily reports are one group, on letter paper.
    And Each kind of guest document is a group of its own on folio paper, since the lodge's folio paper is printed on the back for each kind: the waiver behind the check-in folio, arrival instructions behind the confirmation, nothing behind the check-out bill.
    And Each group shows how many pages it holds, and prints in one action on its own paper size with nothing from any other group, each item on its own page.
    And A document that fails to load is skipped without losing the rest of the batch.
