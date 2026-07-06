# id: b6cUMokfZvubsB4XBF7L
@persona:printing-coordinator @persona:front-desk-supervisor @status:done @priority:4 @printing @confirmations @reservations
Feature: print confirmation slips for reservations booked today

  As Printing coordinator, Front-desk supervisor
  I want to print confirmation slips for reservations booked today
  So that the team can quickly produce confirmations for new bookings while details are still fresh

  Background:
    Given reservations were created today and confirmation slips need to be issued

  Scenario: Acceptance criteria
    Then The user can request confirmation slips for reservations booked today.
    And Only reservations created on the current day are included.
    And The user can send the matching slips to print in one action.
    And Each printed slip follows the lodge’s usual confirmation format.
