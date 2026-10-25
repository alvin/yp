@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @search @date @stay @mode
Feature: search by stay mode

  As Reservation clerk, Front-desk supervisor
  I want to search by stay mode
  So that they can find reservations by departure, in-house, or occupancy needs

  Background:
    Given a clerk switches the date lookup to another stay-based view

  Scenario: Acceptance criteria
    Then Departures lists the stays leaving on the date, each a departure, and none that only arrive or stay over.
    And Both lists the stays arriving and the stays leaving on the date.
    And In house and Occupancy are the same search for a single date: every stay holding a room that day, arrivals and departures included, each shown as an arrival, in house or a departure by what it does that day.
    And A room that has been taken off a stay no longer counts.
    And Over a date range, Both lists every stay overlapping the range, even one arriving before it and leaving after it, each labelled Overlapping; Arrivals and Departures list only the stays arriving or leaving within it.
    And Over a date range, In house and Occupancy match the rooms held during it, and label each row In house.
