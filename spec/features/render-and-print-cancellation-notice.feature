# id: d4vJlSrqpNbLcntdoaOS
@persona:printing-coordinator @persona:front-desk-supervisor @status:done @priority:2 @printing @cancellation @documents
Feature: render and print cancellation notice

  As Printing coordinator, Front-desk supervisor
  I want to render and print cancellation notice
  So that formal cancellation notices are produced consistently

  Background:
    Given staff print cancellation notices from the Print Center

  Scenario: Acceptance criteria
    Then The notice shows the guest name and reservation details needed to identify the booking.
    And The notice clearly states that the reservation has been cancelled.
    And The notice includes the cancellation date or time.
    And The notice can be printed for filing or sharing with the guest.
