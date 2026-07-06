# id: Dvtt8FQgNaAdmwlMQ5W8
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @date-search @navigation @reservation
Feature: open reservation

  As Reservation clerk, Front-desk supervisor
  I want to open reservation
  So that they can move from the list into the guest's reservation details

  Background:
    Given a user selects a guest from the date search results screen

  Scenario: Acceptance criteria
    Then A selected result opens the corresponding reservation workspace.
    And The workspace opened is the one tied to the chosen guest.
    And The user can reach the reservation without redoing the search.
