Feature: Date Search Results
  The date search results screen returns reservations from the production schema
  that match a date-based search and lets staff open the correct reservation.

  Background:
    Given reservation dates are stored in `ypl.reservations.resarrivaldate` and `ypl.reservations.resdeparturedate`
    And room-level occupancy dates are stored in `ypl.room_assignments.occupancyin` and `ypl.room_assignments.occupancyout`
    And date search is exposed through `ypl.search_by_date` and `ypl.search_by_date_range`

  Scenario: View guests arriving on a selected date by default
    Given the user has searched by date from the lookup screen
    When the date search results screen is shown without another mode selected
    Then the user sees guests whose `ypl.reservations.resarrivaldate` matches the selected date

  Scenario: View departures or in-house occupancy when the user chooses that mode
    Given the user has searched by date from the lookup screen
    When the date search mode is departures, both, in-house, or occupancy
    Then the results use `ypl.reservations.resdeparturedate` or `ypl.room_assignments` date ranges as appropriate
    And each row identifies whether the date matched arrival, departure, or in-house occupancy

  Scenario: Review date search results sorted by last name
    Given the date search results screen is shown
    When the list is displayed
    Then the results are ordered alphabetically by last name
    And the list shows last name
    And the list shows first name
    And the list shows room from `ypl.room_assignments` joined to `ypl.rooms`

  Scenario: Open a reservation from the date results list
    Given the date search results screen is shown
    When the user selects a listed reservation
    Then the reservation workflow for the selected stay is opened
    And the selected `ypl.reservations.resnumber` is carried into the transaction screen

  Scenario: View reservations across a selected date range
    Given the user has searched across a date range
    When date search results are shown
    Then reservations can be reviewed for that selected range
    And the range can match arrival dates, departure dates, occupancy rows, or overlapping stays depending on mode
