@persona:reservation-clerk @persona:front-desk-supervisor @persona:kitchen-coordinator @status:done @priority:4 @reservation @notes @kitchen
Feature: capture housekeeping and diet notes when booking

  As Reservation clerk, Front-desk supervisor, Kitchen coordinator
  I want to capture housekeeping and diet notes when booking
  So that what the guest tells us while booking is recorded once, when they say it

  Background:
    Given a guest describes their diet and room needs while the reservation is being taken

  Scenario: Acceptance criteria
    Then Housekeeping notes can be entered while a new reservation is being entered.
    And A diet and its notes can be entered while a new reservation is being entered.
    And Saving stores them against the stay's guest, the same way notes added later are stored.
    And The notes appear on the housekeeping and kitchen reports without any further step.
    And Leaving them blank records no notes at all.
