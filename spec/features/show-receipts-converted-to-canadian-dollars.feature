# id: FsRUMdw1v1sgbMnzKmHZ
@persona:daily-cash-reviewer @status:done @priority:5 @daily-cash @currency @review @mvp
Feature: show receipts converted to canadian dollars

  As Daily cash reviewer
  I want to show receipts converted to canadian dollars
  So that the reviewer can see the amount in Canadian dollars for balancing without changing the lodge’s existing cash review process

  Background:
    Given when daily cash is being reviewed and a receipt includes U.S. funds

  Scenario: Acceptance criteria
    Then The review view shows the original U.S. amount and the Canadian dollar equivalent for each applicable receipt.
    And The conversion is visible during daily cash review without requiring the reviewer to leave the workflow.
    And Amounts that are already in Canadian dollars are shown normally and are not marked as converted.
    And The displayed conversion is consistent with the lodge’s current balancing practice.
