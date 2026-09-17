@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @reservation @rebooking
Feature: re-book a stay for next year

  As Reservation clerk, Front-desk supervisor
  I want to re-book a stay for next year
  So that a departing guest renews for the same week next season in one pass, without their current stay being disturbed

  Background:
    Given a guest departing today asks to come back next year

  Scenario: Acceptance criteria
    Then Re-booking opens a new reservation carrying the guest's name, contact details and diet.
    And The party size, bed type, group and room come across, and every field can be changed before saving.
    And The dates offered are the same stay next season — the same weekday, 52 weeks on — and can be changed.
    And The reservation re-booked from is left exactly as it stands: not cancelled, still holding its own deposit and charges.
    And Saving records which reservation the stay was re-booked from.
    And A deposit taken for next year is recorded against the new reservation while it is being booked.
