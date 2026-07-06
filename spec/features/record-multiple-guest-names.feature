# id: tcbdlQzqyK7025TH6edh
@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @reservation @guest-names @printing
Feature: record multiple guest names

  As Reservation clerk, Front-desk supervisor
  I want to record multiple guest names
  So that staff can identify everyone tied to the reservation and print documents with the right names

  Background:
    Given a reservation has more than one guest name to associate with the stay

  Scenario: Acceptance criteria
    Then More than one guest name can be stored against the same reservation ledger context.
    And Each guest name is visible when the reservation is opened.
    And The reservation can still be found and managed as one stay even with several names attached.
    And Printed reservation documents include the recorded guest names where names are shown.
