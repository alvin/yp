# id: mbeFUNSY4bCuCsvJMgEM
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @guest-profile @contact-details
Feature: show guest address

  As Reservation clerk, Front-desk supervisor
  I want to show guest address
  So that they can review the guest’s mailing details without leaving the profile view

  Background:
    Given a staff member opens a guest profile from name search results

  Scenario: Acceptance criteria
    Then The guest address is visible on the guest profile and reservation-history view.
    And The address is shown in a clear, readable format for staff use.
    And The address remains visible while viewing the guest’s future, in-house, and past stays.
