@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @reservation @guest-profile @contact-details
Feature: attach an existing guest to a new reservation

  As Reservation clerk, Front-desk supervisor
  I want to attach an existing guest to a new reservation
  So that a returning guest's details do not have to be typed again or chased afterwards

  Background:
    Given a returning guest is being booked from the new reservation screen

  Scenario: Acceptance criteria
    Then An existing guest can be found from part of their name without spelling it in full.
    And Choosing a guest fills the whole stored record, including the street address, postal code, and country.
    And The filled details can still be corrected before the reservation is saved.
    And The reservation is attached to the existing guest record rather than creating a second one.
