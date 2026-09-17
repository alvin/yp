@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @lookup @search @guest
Feature: find a guest by guest number

  As Reservation clerk, Front-desk supervisor
  I want to find a guest by guest number
  So that the number shown on a guest record finds that record again

  Background:
    Given staff search all fields with a guest number

  Scenario: Acceptance criteria
    Then Entering a guest number returns that guest, naming the guest number as the field that matched.
    And The guest number matches only when it is entered in full, so it does not crowd out the other matches.
    And A reservation number still returns its reservation.
