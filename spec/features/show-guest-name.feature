# id: oMzS0bAJ491FX2HyWPiZ
@persona:operations-lead @status:done @priority:5 @kitchen @filtered-report @guest
Feature: show guest name

  As Operations lead
  I want to show guest name
  So that staff can match meal planning details to the correct guest

  Background:
    Given when the filtered kitchen report is viewed

  Scenario: Acceptance criteria
    Then Guest name appears on the filtered kitchen report for each listed stay.
    And The name is easy to read alongside the guest’s meal-related information.
    And Each entry can be identified by guest name without opening another record.
    And No guest name is replaced with room-only identification.
