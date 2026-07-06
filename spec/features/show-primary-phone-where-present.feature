# id: vl8mmwIiPBnQfiZ13tk8
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @guest-profile @phone @contact-details
Feature: show primary phone where present

  As Reservation clerk, Front-desk supervisor
  I want to show primary phone where present
  So that they can contact the guest using the main phone number on file

  Background:
    Given a staff member opens a guest profile from name search results

  Scenario: Acceptance criteria
    Then The primary phone number is shown when one exists.
    And The primary phone number is not shown as blank or misleading when no number is on file.
    And The primary phone number is visible on the guest profile and reservation-history view.
