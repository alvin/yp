# id: tjPjZbB4toId2jaYvhhr
@persona:front-desk-supervisor @persona:reservation-clerk @persona:operations-lead @status:done @priority:5 @lookup @navigation
Feature: open the lookup home screen

  As Front-desk supervisor, Reservation clerk, Operations lead
  I want to open the lookup home screen
  So that so they can start searching immediately

  Background:
    Given a staff member opens the system

  Scenario: Acceptance criteria
    Then The user sees inputs for guest name, reservation number, and date search
    And The user sees a New Reservation action
    And The user sees Print Menu and Daily Cash Report actions
    And The user sees a Search All Fields (Query) action
