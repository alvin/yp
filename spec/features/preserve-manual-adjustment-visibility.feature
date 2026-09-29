# id: z4gd1tHVEEF4Ryq8pJgb
@persona:front-desk-supervisor @status:done @priority:5 @reconciliation @adjustments @manual-workflow
Feature: preserve manual adjustment visibility

  As Front-desk supervisor
  I want to preserve manual adjustment visibility
  So that staff tips and coded adjustments are still written on the printed sheet by hand while the lodge decides whether the system should store them

  Background:
    Given a front-desk supervisor balances the day on the printed Daily Cash Activity Report

  Scenario: Acceptance criteria
    Then The upper section keeps a blank Adjustments column for handwritten entries.
    And The cash section keeps blank Actual Amount and Adjustments columns beside the calculated amount.
    And The manual columns print empty; nothing is filled in for staff.
    And No adjustment is stored in the system until the lodge decides it should be.
