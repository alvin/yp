@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @business-logic @charges @pricing
Feature: price charges from the lodge price lists

  As Reservation clerk, Front-desk supervisor
  I want to price charges from the lodge price lists
  So that lines default to the right price while manual overrides stay possible

  Background:
    Given a charge line is posted without an explicit amount

  Scenario: Acceptance criteria
    Then An inventory charge defaults to the item's list price times the quantity.
    And A room-night charge defaults to the room rate effective for the date times the nights.
    And A manually supplied amount always wins over the list price.
    And Taxes are computed on whichever amount the line ends up with.
