# id: do9eyvCw1OuGbeWjpuc0
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @reservation @stay @ledger
Feature: view selected stay context

  As Reservation clerk, Front-desk supervisor
  I want to view selected stay context
  So that staff can confirm the current stay at a glance before making changes

  Background:
    Given a reservation is selected in the transaction workspace

  Scenario: Acceptance criteria
    Then The guest details for the selected stay are visible
    And The reservation details for the selected stay are visible
    And The occupancy lines for the selected stay are visible
    And The charge lines for the selected stay are visible
    And The payment lines for the selected stay are visible
