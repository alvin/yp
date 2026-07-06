# id: FuHfeQfq3i6u8Ow9mrQt
@persona:reservation-clerk @status:done @priority:4 @search @date @arrival
Feature: search by arrival date

  As Reservation clerk
  I want to search by arrival date
  So that they can find reservations arriving on that date

  Background:
    Given a clerk selects a single date and uses the default date search mode

  Scenario: Acceptance criteria
    Then The selected date is treated as an arrival date search by default.
    And The results show reservations arriving on the chosen date.
    And The search is driven from a single selected date.
    And Staff can open a listed reservation from the results.
