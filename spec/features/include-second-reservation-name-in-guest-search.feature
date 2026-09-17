@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @lookup @search @name-search @guest
Feature: include second reservation name in guest search

  As Reservation clerk, Front-desk supervisor
  I want to include second reservation name in guest search
  So that a stay booked under two names is found from either of them

  Background:
    Given a reservation records more than one name — partners, or a second surname

  Scenario: Acceptance criteria
    Then Searching either name on the stay finds the person of that name.
    And A double surname recorded in one field is found from either half of it.
    And Each match shows the other names its stays are booked under, so the stay is recognised from the name that was searched.
    And A search returns the people it names and no one else: travelling with a match is not itself a match.
