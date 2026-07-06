# id: L5MysewYuhWaKehdGB00
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @reservation-history @future-stays @room-context
Feature: display arrival date and room context for future history rows

  As Reservation clerk, Front-desk supervisor
  I want to display arrival date and room context for future history rows
  So that they can see what is planned and which room is expected

  Background:
    Given when staff review upcoming reservations on a guest profile

  Scenario: Acceptance criteria
    Then Upcoming reservation rows show the arrival date.
    And Upcoming reservation rows show the room context when assigned.
    And The future section remains readable even when more than one upcoming stay exists.
