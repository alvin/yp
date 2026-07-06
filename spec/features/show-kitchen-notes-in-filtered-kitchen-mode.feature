# id: 2N7HuY5cPJmuL9ilYeKB
@persona:kitchen-coordinator @status:done @priority:4 @kitchen @reporting @notes @display
Feature: show kitchen notes in filtered kitchen mode

  As Kitchen coordinator
  I want to show kitchen notes in filtered kitchen mode
  So that they can see important meal instructions and prepare special meals correctly

  Background:
    Given a kitchen coordinator reviews a filtered meal report

  Scenario: Acceptance criteria
    Then Kitchen notes are visible in the filtered report
    And Notes are shown next to the relevant guest or meal entry
    And The notes are included in both on-screen and printed output
    And Special instructions remain easy to read for kitchen use
