@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @notes @internal @screen-only
Feature: keep guest notes private

  As Reservation clerk, Front-desk supervisor
  I want to keep guest notes private
  So that office staff can work from the note without exposing it on printed guest paperwork

  Background:
    Given staff add notes for internal follow-up

  Scenario: Acceptance criteria
    Then A note can be kept on the guest record for office use.
    And The note opens from the transaction screen and from the guest's page.
    And The note does not appear on printed guest documents or operational reports.
    And The note stays with the guest for staff to review on any later stay.
