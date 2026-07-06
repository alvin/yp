# id: 9BoMLHTnRFGZry1SqC6h
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @notes @internal @screen-only
Feature: keep guest notes private

  As Reservation clerk, Front-desk supervisor
  I want to keep guest notes private
  So that office staff can work from the note without exposing it on printed guest paperwork

  Background:
    Given staff add notes for internal follow-up

  Scenario: Acceptance criteria
    Then A note can be added to the current stay for office use.
    And The note is visible on the transaction screen.
    And The note does not appear on printed guest documents.
    And The note remains available for staff to review later during the stay.
