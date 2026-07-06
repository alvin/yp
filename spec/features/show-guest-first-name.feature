# id: dzOPkoDAdo4BEbjXLhLM
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @search @guest @results
Feature: show guest first name

  As Reservation clerk, Front-desk supervisor
  I want to show guest first name
  So that they can identify the correct guest more easily

  Background:
    Given when reservation staff review date-based search results

  Scenario: Acceptance criteria
    Then Each result row shows the guest's first name.
    And The first name is visible without opening the reservation.
    And The first name appears alongside the guest last name.
