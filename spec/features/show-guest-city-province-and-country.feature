# id: VzLaYBOelWfv2EDnb4Kw
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @guest-profile @address @location
Feature: show guest city province and country

  As Reservation clerk, Front-desk supervisor
  I want to show guest city province and country
  So that they can verify the guest’s location details at a glance

  Background:
    Given a staff member opens a guest profile from name search results

  Scenario: Acceptance criteria
    Then The guest city, province, and country are visible on the guest profile and reservation-history view.
    And The location details are shown together in a staff-friendly format.
    And The location details remain available while reviewing the guest’s future, in-house, and past stays.
