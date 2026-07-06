# id: wTwlzVBU344MHzPlkY0d
@persona:front-desk-supervisor @persona:reservation-clerk @status:done @priority:4 @guest-details @name-search
Feature: view guest details for a selected name match

  As Front-desk supervisor, Reservation clerk
  I want to view guest details for a selected name match
  So that so they can see the guest’s contact information

  Background:
    Given a staff member lands on the name search results screen for a selected name match

  Scenario: Acceptance criteria
    Then The guest name is displayed
    And The guest number and primary contact details are displayed
    And The guest’s address, city, province, and country are displayed
    And Primary phone, secondary phone, and email are displayed
