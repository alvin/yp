@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @lookup @search @name-search @guest
Feature: include second reservation name in guest search

  As Reservation clerk, Front-desk supervisor
  I want to include second reservation name in guest search
  So that a stay booked under two names is found from either of them

  Background:
    Given a reservation records more than one name — partners, or a second surname

  Scenario: Acceptance criteria
    Then Searching either name on the stay returns that party.
    And A guest reached through the other name on the stay is marked as such, not confused with a direct name match.
    And Direct name matches are listed before names reached through a shared stay.
    And Each match shows the other names its stays are booked under.
