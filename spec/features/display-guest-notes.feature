# id: KT9DUHmVkhiTt2mozuzt
@persona:reservation-clerk @persona:front-desk-supervisor @persona:operations-lead @status:done @priority:5 @guest-notes @office-use @visibility
Feature: display guest notes

  As Reservation clerk, Front-desk supervisor, Operations lead
  I want to display guest notes
  So that they can read office-only notes while working the reservation

  Background:
    Given office staff open a guest record in the guest notes view

  Scenario: Acceptance criteria
    Then Guest notes are visible to authorized office staff in the guest notes view.
    And The notes are clearly presented as office-use information only.
    And Staff can review the notes without exposing them to guests or other non-office users.
