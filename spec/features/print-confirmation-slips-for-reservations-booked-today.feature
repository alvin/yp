# id: b6cUMokfZvubsB4XBF7L
@persona:printing-coordinator @persona:front-desk-supervisor @status:done @priority:4 @printing @confirmations @reservations
Feature: print confirmation slips for reservations booked today

  As Printing coordinator, Front-desk supervisor
  I want to print confirmation slips for reservations booked today
  So that the team can quickly produce confirmations for new bookings while details are still fresh

  Background:
    Given reservations were booked or confirmed on a chosen day and their confirmation slips need to be issued

  Scenario: Acceptance criteria
    Then The user can list confirmation slips for any chosen day, today by default.
    And Only reservations booked or confirmed on that day are included; cancelled reservations are left out.
    And The day's slips print together in the batch run's folio group.
    And Each printed slip follows the lodge’s usual confirmation format.
