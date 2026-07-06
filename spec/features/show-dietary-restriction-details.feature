# id: mCFCfAGgPvlVFDqyMfgS
@persona:operations-lead @status:done @priority:5 @kitchen @reporting @dietary
Feature: show dietary restriction details

  As Operations lead
  I want to show dietary restriction details
  So that staff can see dietary restriction details needed for meal planning

  Background:
    Given when the kitchen report is viewed

  Scenario: Acceptance criteria
    Then Dietary restriction details appear on the kitchen report for each relevant guest.
    And The details are readable without opening any other record.
    And The report includes every dietary restriction recorded for the stay.
    And No dietary restriction details are replaced with a generic label.
