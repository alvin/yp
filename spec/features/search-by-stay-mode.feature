# id: UhA0w8E1n4ioVEjXw0tr
@persona:reservation-clerk @status:done @priority:4 @search @date @stay
Feature: search by stay mode

  As Reservation clerk
  I want to search by stay mode
  So that they can find reservations by departure, in-house, or occupancy needs

  Background:
    Given a clerk switches the date lookup to another stay-based view

  Scenario: Acceptance criteria
    Then The lookup supports departure date searches.
    And The lookup supports both arrival and departure searches.
    And The lookup supports in-house searches.
    And The lookup supports occupancy-based searches.
