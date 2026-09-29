# id: ZKe4ba8f9BjXcvhzJhHA
@persona:kitchen-coordinator @persona:operations-lead @status:done @priority:3 @kitchen-report @printing @meal-planning @reservation-identification
Feature: show reservation number in kitchen reports

  As Kitchen coordinator, Operations lead
  I want to show reservation number in kitchen reports
  So that entries can be traced back to the correct reservation without ambiguity

  Background:
    Given kitchen and office staff review printed kitchen reports

  Scenario: Acceptance criteria
    Then Each printed reservation row includes a visible reservation number.
    And The reservation number appears in both full and filtered kitchen report views.
    And The reservation number remains readable alongside the guest name and meal details.
    And The 7-day kitchen report shows the reservation number on every row too.
