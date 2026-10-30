@persona:operations-lead @status:done @priority:4 @security @access @admin
Feature: restrict the admin area to the admin login

  As Operations lead
  I want a separate admin area that only the admin login can open
  So that sales, year-end figures, taxes and prices can be looked after without Supabase, and out of the front desk's way

  Background:
    Given the admin login is admin@yellowpointlodge.com

  Scenario: Acceptance criteria
    Then The admin login is created by the seeds, on the local stack and on the hosted project alike.
    And Signing in as the admin login opens the admin area, at /admin.
    And The admin area has its own navigation bar: Sales Reports, Item Prices, Rooms & Rates, Taxes and Year End Deposits, with a way back to the front desk and to sign out.
    And Any other signed-in login that opens the admin area is taken to the lookup screen, and its front desk header has no Admin button; the admin login's has one.
    And Only the admin login can change the tax rates, the items and item types, the rooms and their rates, the rate codes and the room types; for anyone else the database refuses the change, whether it comes from the app or straight from the API.
    And Every signed-in login still reads the prices and taxes the front desk charges with.
