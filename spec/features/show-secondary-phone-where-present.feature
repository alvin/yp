# id: EybukSx2FeY49vByYYVT
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:3 @guest-profile @phone @contact-details
Feature: show secondary phone where present

  As Reservation clerk, Front-desk supervisor
  I want to show secondary phone where present
  So that they can use an alternate contact number when needed

  Background:
    Given a staff member opens a guest profile from name search results

  Scenario: Acceptance criteria
    Then The secondary phone number is shown when one exists.
    And The secondary phone number is not shown as blank or misleading when no number is on file.
    And The secondary phone number is visible on the guest profile and reservation-history view.
