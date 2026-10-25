@persona:front-desk-supervisor @persona:reservation-clerk @persona:operations-lead @status:done @priority:5 @lookup @navigation
Feature: open the lookup home screen

  As Front-desk supervisor, Reservation clerk, Operations lead
  I want to open the lookup home screen
  So that they can start searching, booking, printing or cashing up straight away

  Background:
    Given a staff member opens the system

  Scenario: Acceptance criteria
    Then The user sees inputs for guest name, reservation number, and date search.
    And The user sees a New Reservation action.
    And The user sees a Search All Fields (Query) action.
    And Print Center opens the print menu on its own screen: the day's batch, the daily reports and the guest documents, each document also by reservation number.
    And Daily Cash Report opens the Daily Cash Activity Report for today.
