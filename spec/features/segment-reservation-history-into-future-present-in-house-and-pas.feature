# id: 0l93c3ZJEwY137em9nKg
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @reservation-history @segmentation @guest-context
Feature: segment reservation history into future present in-house and past sections

  As Reservation clerk, Front-desk supervisor
  I want to segment reservation history into future present in-house and past sections
  So that they can understand the guest’s activity over time at a glance

  Background:
    Given when staff review a guest’s reservation history

  Scenario: Acceptance criteria
    Then Reservation history is grouped into future, current in-house, and past sections.
    And Each reservation appears in only the section that matches its stay timing.
    And The section labels are easy to read and support quick scanning.
