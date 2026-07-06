# id: jPYXdhiKuFCTpCaAKWw6
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @reservation-lookup
Feature: open a reservation from a reservation number

  As Reservation clerk, Front-desk supervisor
  I want to open a reservation from a reservation number
  So that the reservation’s transaction workspace opens for that stay

  Background:
    Given the user enters a reservation number on the lookup screen

  Scenario: Acceptance criteria
    Then The system finds the matching reservation record
    And The transaction screen opens for the selected stay
    And The reservation number is carried into the transaction screen
