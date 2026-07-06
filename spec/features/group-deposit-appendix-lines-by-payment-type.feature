# id: TcBJiDzp0xOmVZN2lm05
@persona:daily-cash-reviewer @persona:front-desk-supervisor @status:done @priority:4 @dcar @deposits @grouping
Feature: group deposit appendix lines by payment type

  As Daily cash reviewer, Front-desk supervisor
  I want to group deposit appendix lines by payment type
  So that staff can compare deposit activity by payment type and balanced amounts more easily

  Background:
    Given when deposit appendix details are reviewed

  Scenario: Acceptance criteria
    Then Deposit appendix lines are grouped by payment type
    And Each group shows the related funds amounts
    And Each group shows the related Canadian-dollar amounts
    And The grouping supports manual balancing in the lodge’s normal report review
