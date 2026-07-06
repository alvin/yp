# id: ZKe4ba8f9BjXcvhzJhHA
@status:done @priority:3 @kitchen-report @printing @meal-planning @reservation-identification
Feature: show reservation number in kitchen reports

  As a user
  I want to show reservation number in kitchen reports
  So that so that entries can be traced back to the correct reservation without ambiguity

  Background:
    Given when kitchen staff and office staff review printed kitchen reports

  Scenario: Acceptance criteria
    Then Each printed reservation row includes a visible reservation number.
    And The reservation number appears in both full and filtered kitchen report views.
    And The reservation number remains readable alongside the guest name and meal details.
    And Filtered views such as allergy-only mode still show the reservation number for every included row.
