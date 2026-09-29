@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @search @date @arrival @results-list
Feature: search by arrival date

  As Reservation clerk, Front-desk supervisor
  I want to search by arrival date
  So that staff can quickly see who is expected to arrive on a chosen date

  Background:
    Given a clerk searches a single date without choosing another mode

  Scenario: Acceptance criteria
    Then The date search defaults to arrivals unless another mode is chosen.
    And The results show the reservations arriving on the chosen date, and only those.
    And Each row shows the stay's dates, party size and the deposit still held — received, less any refunded, applied to the bill or kept.
    And Staff can open a listed reservation from the results.
