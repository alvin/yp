@persona:printing-coordinator @persona:front-desk-supervisor @status:done @priority:4 @printing @batch @paper-sizes
Feature: print each batch document on its own paper stock

  As Printing coordinator, Front-desk supervisor
  I want to print each batch document on its own paper stock
  So that the daily run comes off the right printer on the right paper without re-sorting it by hand

  Background:
    Given the batch print run is prepared for a business date

  Scenario: Acceptance criteria
    Then The batch is grouped by the paper each document prints on.
    And Each group shows how many pages it holds and prints on its own.
    And Daily reports print on letter paper and guest documents on folio paper.
    And A single document opened on its own prints on the same paper as it does in the batch.
