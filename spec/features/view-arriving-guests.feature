# id: ODS9rOUSWT304riPgZkD
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @date-search @arrivals @results-list
Feature: view arriving guests

  As Reservation clerk, Front-desk supervisor
  I want to view arriving guests
  So that staff can quickly see who is expected to arrive that day

  Background:
    Given a date search is run with the default arrival view

  Scenario: Acceptance criteria
    Then The results list shows reservations that match the selected date as arrivals.
    And The default view is arrivals unless another mode is chosen.
    And The list is ready for staff to open a reservation from the results.
