@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @lookup @search @broad
Feature: match a phone number in any format

  As Reservation clerk, Front-desk supervisor
  I want to match a phone number in any format
  So that a number is typed and found the way it is read off a caller display, not the way the file happens to hold it

  Background:
    Given staff enter and search telephone numbers

  Scenario: Acceptance criteria
    Then A number entered without punctuation finds a guest whose number is stored with it.
    And A number entered with brackets, spaces or dashes finds a guest whose number is stored without them.
    And A number broken by spaces is read as one number, not as several keywords the record must all carry.
    And A short run of digits is not treated as a telephone number.
    And A telephone field accepts the number typed any way and writes it back in the format the lodge's records use.
    And A number the format does not cover — an overseas number, one with an extension beside it — is kept exactly as typed.
    And Numbers already on file are left as they are.
