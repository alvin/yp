# id: JPQsq9M662jSDTz8fHiZ
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @reservation @guest-profile @contacts
Feature: create guest profile

  As Reservation clerk, Front-desk supervisor
  I want to create guest profile
  So that the guest can be added without leaving the reservation process

  Background:
    Given working in the reservation workflow and starting a stay for a guest who is not yet on file

  Scenario: Acceptance criteria
    Then A new guest profile can be started from the reservation workspace.
    And The clerk can enter the guest's name and contact details before saving the stay.
    And The guest profile is available for use in the reservation being created.
    And The workflow stays focused on reservation handling rather than a separate guest-management process.
