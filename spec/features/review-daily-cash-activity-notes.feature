# id: QNkMmzPW5Jt0E7er7NCz
@persona:daily-cash-reviewer @status:done @priority:5 @daily-cash @notes @review
Feature: review daily cash activity notes

  As Daily cash reviewer
  I want to review daily cash activity notes
  So that the reviewer can confirm the notes that support the daily cash report

  Background:
    Given a daily cash reviewer opens the daily cash activity notes display during the cash review workflow

  Scenario: Acceptance criteria
    Then The notes for the day are shown clearly in the review view.
    And The reviewer can read the notes without leaving the cash review workflow.
    And The notes are presented as part of the daily cash report review set.
    And The reviewer can distinguish these notes from other daily cash review information.
