# id: 1hBaJ2NzD7BeKr9rz9WP
@persona:front-desk-supervisor @persona:operations-lead @status:done @priority:5 @tax @reporting @accounting
Feature: capture tax details

  As Front-desk supervisor, Operations lead
  I want to capture tax details
  So that staff can produce reports with the right tax breakdown

  Background:
    Given transaction details are needed for tax reporting

  Scenario: Acceptance criteria
    Then The transaction stores the details needed for tax calculation.
    And The transaction supports a tax breakdown for reporting.
    And The recorded details can be used in daily accounting output.
