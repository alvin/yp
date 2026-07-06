# id: DnHAACgUdN8paf7mExGD
@persona:operations-lead @status:done @priority:5 @kitchen @reporting @wording
Feature: preserve kitchen wording

  As Operations lead
  I want to preserve kitchen wording
  So that staff can rely on the report to match the wording entered by front-desk or office teams

  Background:
    Given when kitchen notes are shown in the report

  Scenario: Acceptance criteria
    Then Kitchen wording appears in the report in a form that closely matches the original entry.
    And The report does not rewrite the wording into a different meaning.
    And Staff can recognize the same instruction that was originally entered.
    And Important wording is not shortened in a way that changes its meaning.
