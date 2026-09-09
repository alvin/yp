@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @charges @ledger @billing
Feature: remove a charge entered in error

  As Reservation clerk, Front-desk supervisor
  I want to remove a charge entered in error
  So that a mistaken charge or receipt can be taken off the stay instead of standing on the guest's bill

  Background:
    Given a charge or payment was posted to the wrong reservation or entered by mistake

  Scenario: Acceptance criteria
    Then A charge line on the reservation can be removed.
    And A payment or deposit line on the reservation can be removed the same way.
    And Staff confirm the line before it is removed, and can see what they are removing.
    And The removed line leaves the reservation balance and every report, including daily cash.
    And The line is archived rather than deleted, so the correction stays on record.
    And Removing a line that has already gone is reported as an error rather than silently doing nothing.
