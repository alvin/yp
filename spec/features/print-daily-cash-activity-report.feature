@persona:daily-cash-reviewer @persona:front-desk-supervisor @status:done @priority:5 @daily-cash @dcar @printing @reports
Feature: print daily cash activity report

  As Daily cash reviewer, Front-desk supervisor
  I want to print daily cash activity report
  So that the day's cash activity is on paper for balancing and the office records

  Background:
    Given a daily cash reviewer has chosen a business date

  Scenario: Acceptance criteria
    Then The report opens for the chosen business date, and the date prints in its heading.
    And The upper section lists the day's sales and charges by category and their Total Sales and Charges, then each tax and Total Taxes, then the adjustments, and comes to the day's revenue and expenses.
    And The lower section lists the receipts by type of cash, then Total Receipts Today and the Balance Owed.
    And A stay's charges and their taxes count on the day the guest checks out; a charge posted after its stay's check-out day, such as a walk-in sale on a daily sales account, counts on the day it is posted.
    And Receipts by type of cash are the money taken or paid out that day.
    And Every payment type and charge category used that day has its own line, so the lines always add up to the totals.
    And A print action on the report sends it to paper.
    And The printed sheet keeps the columns the lodge fills in by hand — Adjustments beside each upper line, Actual Amount and Adjustments beside each type of cash — and prints them empty; no hand adjustment is stored.
