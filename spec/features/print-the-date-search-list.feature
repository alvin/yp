@persona:front-desk-supervisor @persona:reservation-clerk @status:done @priority:4 @printing @search @results
Feature: print the date search list

  As Front-desk supervisor, Reservation clerk
  I want to print the date search list
  So that the day's list can be carried away from the screen without anything falling off the page

  Background:
    Given a date search has returned a list of stays

  Scenario: Acceptance criteria
    Then The list prints from the results screen.
    And Every column on screen reaches the paper; nothing is cut off at the right-hand edge.
    And The list prints across the sheet, since it is wider than it is tall.
    And The sections and their headings print as they appear on screen.
    And The controls used to run the search do not print.
