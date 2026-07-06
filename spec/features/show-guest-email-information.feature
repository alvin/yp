# id: 59fiZUigj3vJGVJ5jBLm
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @guest-profile @email @contact-details
Feature: show guest email information

  As Reservation clerk, Front-desk supervisor
  I want to show guest email information
  So that they can use the guest’s email for follow-up and correspondence

  Background:
    Given a staff member opens a guest profile from name search results

  Scenario: Acceptance criteria
    Then The guest email is visible on the guest profile and reservation-history view.
    And The email is shown in a clear, readable format for staff use.
    And The email remains available while viewing the guest’s future, in-house, and past stays.
