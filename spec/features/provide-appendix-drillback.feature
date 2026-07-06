# id: N32rc94wwANLksLV9gtT
@persona:daily-cash-reviewer @status:done @priority:5 @daily-cash @appendix @audit @review
Feature: provide appendix drillback

  As Daily cash reviewer
  I want to provide appendix drillback
  So that the reviewer can trace the summary back to the related appendix detail for audit confidence

  Background:
    Given when a daily cash summary is being checked and an appendix total needs support

  Scenario: Acceptance criteria
    Then The daily cash summary provides a clear path to the related appendix detail.
    And The path follows the same upper and lower structure used in the daily cash workflow.
    And The reviewer can move from the summary to the supporting appendix information without losing the review context.
    And The drillback supports audit traceability for the daily cash review process.
