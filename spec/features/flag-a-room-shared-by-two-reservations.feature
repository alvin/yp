@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @occupancy @rooms @lookup
Feature: flag a room shared by two reservations

  As Reservation clerk, Front-desk supervisor
  I want to flag a room shared by two reservations
  So that a room held by two parties at once is seen at a glance, whether it was meant or not

  Background:
    Given two live reservations hold the same room over nights they both occupy

  Scenario: Acceptance criteria
    Then Both reservations are identified as sharing the room.
    And The sharing is marked on the date search results and on the reservation screen.
    And The mark names the other party and the nights they share.
    And Two stays that only meet at a turnover — one leaving the day the next arrives — are not marked as sharing.
    And A cancelled reservation does not make a room look shared.
