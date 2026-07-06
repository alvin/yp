# id: mkXrLje3nOhgf7MNCXGj
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @reservation-history @in-house @active-stay
Feature: display in-house stay context when active

  As Reservation clerk, Front-desk supervisor
  I want to display in-house stay context when active
  So that they can immediately identify the active stay and its current room context

  Background:
    Given when staff review a guest who is currently staying at the lodge

  Scenario: Acceptance criteria
    Then The current in-house stay appears in the in-house section.
    And The active stay is visually distinct from past and future reservations.
    And The room context for the active stay is shown when available.
