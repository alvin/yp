# id: 96wAPHEzOkvl1Idyaeix
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @reservation-history @shared-booking @guest-context
Feature: represent multi-name reservation participation within history context

  As Reservation clerk, Front-desk supervisor
  I want to represent multi-name reservation participation within history context
  So that they can understand the guest’s role in shared bookings without confusion

  Background:
    Given when staff review a guest tied to a reservation shared with other names

  Scenario: Acceptance criteria
    Then Shared reservations indicate that the guest is part of a multi-name booking when applicable.
    And The history view makes the guest’s participation understandable in context.
    And The display does not imply the guest is the only person attached to the reservation when that is not true.
