@persona:front-desk-supervisor @persona:printing-coordinator @status:done @priority:3 @reports @printing @notes
Feature: print requests reports

  As Front-desk supervisor, Printing coordinator
  I want printable lists of guests' requests
  So that the office sees a day's requests at a glance, and a guest's requests over their stays

  Background:
    Given guests' requests are kept on the Requests tab of their reservations

  Scenario: Acceptance criteria
    Then The Requests report lists, for a chosen day, every stay at the lodge that day with a request (arriving, in house or departing, as on the In House report), by guest name, with its rooms and dates.
    And It is among the Print Center's daily reports and the daily report tabs.
    And A guest's requests open from a Requests button beside Guest notes, on the reservation screen and the guest's page, and list each of their stays with a request, oldest first.
    And A cancelled stay's requests are left out of both.
