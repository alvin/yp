@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @lookup @search @results
Feature: return more name matches in a scrollable list

  As Reservation clerk, Front-desk supervisor
  I want to return more name matches in a scrollable list
  So that a common surname does not hide the guest we are looking for

  Background:
    Given a name search matches more guests than fit on screen at once

  Scenario: Acceptance criteria
    Then A name search returns well beyond a handful of matches.
    And The result list scrolls instead of cutting the matches short.
    And The closest matches are listed first so the common case stays at the top.
    And Staff can open any guest in the list, not only the first few.
