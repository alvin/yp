@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @notes @internal @screen-only
Feature: keep office notes private

  As Reservation clerk, Front-desk supervisor
  I want notes for the office alone, about the guest and about the reservation
  So that staff can work from them without exposing them on anything printed

  Background:
    Given staff add notes for internal follow-up

  Scenario: Acceptance criteria
    Then Guest notes are kept on the guest record and open from the guest's page and the reservation screen.
    And Reservation notes are kept on the reservation and open from its Reservation details card, for what is particular to that stay, such as arriving late.
    And Both are marked as office only and never printed, and a dot on the button shows when there is a note.
    And Staff can edit and save them; guest notes stay with the guest for any later stay.
    And Neither prints on any guest document or daily report.
