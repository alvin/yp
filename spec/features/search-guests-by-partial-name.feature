@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @lookup @search @name-search
Feature: search guests by partial name

  As Reservation clerk, Front-desk supervisor
  I want to search guests by partial name
  So that a guest is found from the part of the name we can remember, however it is typed

  Background:
    Given staff look a guest up by name, on the lookup home screen or while booking a new reservation

  Scenario: Acceptance criteria
    Then Any part of a name matches — the middle or end of a surname, not only its start.
    And Placeholder punctuation typed for the forgotten part of a name is ignored, so "-illington" finds "Shillington".
    And Typing more characters narrows the list rather than losing the match.
    And Every keyword typed must appear in the name, so a first and last name together find one guest.
    And The same partial-name search is used wherever a guest is looked up, including the guest lookup on a new reservation.
