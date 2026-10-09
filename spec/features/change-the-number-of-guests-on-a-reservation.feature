@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @reservation @guests @business-logic
Feature: change the number of guests on a reservation

  As Reservation clerk, Front-desk supervisor
  I want to change the number of guests on a reservation
  So that a party that grows or shrinks after booking is counted right on the daily reports and guest documents

  Background:
    Given a booked party changes size

  Scenario: Acceptance criteria
    Then The number of guests on a reservation, adults and children, can be changed after it is booked, from its Guests field.
    And Every room the whole party is in takes the new number, so the housekeeping and in-house reports, Total Guests and the guest documents count it.
    And Rooms the stay holds side by side split the party between them, so each keeps its own number, which can be changed on its own.
    And The rooms follow the same way when the number is changed straight in the database.
    And A reservation holds at least one guest, and a room at least one; a number under that is refused.
    And A cancelled reservation's number of guests is not offered for change, as its dates are not.
