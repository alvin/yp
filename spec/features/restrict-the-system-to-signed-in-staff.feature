@persona:operations-lead @persona:front-desk-supervisor @status:done @priority:5 @security @access @staff
Feature: restrict the system to signed-in staff

  As Operations lead, Front-desk supervisor
  I want to restrict the system to signed-in staff
  So that guest and financial data is only available to the office

  Background:
    Given someone opens the front desk system

  Scenario: Acceptance criteria
    Then Opening any screen without signing in redirects to the staff sign-in.
    And Anonymous connections receive no access to lodge data.
    And Signed-in staff can read and write all front desk data.
    And Staff can sign out from the application header.
