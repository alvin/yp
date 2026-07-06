# id: p7wRSeKJ39KNKjkBomeH
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @guest-profile @search-results @identification
Feature: show guest number

  As Reservation clerk, Front-desk supervisor
  I want to show guest number
  So that they can confirm the guest record they are viewing belongs to the right person

  Background:
    Given a staff member opens a guest profile from name search results

  Scenario: Acceptance criteria
    Then The guest number is visible on the guest profile and reservation-history view.
    And The guest number matches the selected guest record from the search results.
    And The guest number is shown consistently across the future, in-house, and past stay sections.
