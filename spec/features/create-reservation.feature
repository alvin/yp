@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @reservation @stay @booking @guest-profile @contacts
Feature: create reservation

  As Reservation clerk, Front-desk supervisor
  I want to create reservation
  So that the stay is held for the guest, and a guest new to the lodge is put on file in the same pass

  Background:
    Given working in the reservation workspace and entering the basic details for a new stay

  Scenario: Acceptance criteria
    Then The clerk begins a new reservation from the lookup screen's New Reservation action.
    And A guest not yet on file is entered on the same screen — name, address, city, province, postal code, country, phone and email, and nothing the lodge does not write to or call — and saving puts them on file.
    And The reservation holds the stay's dates, the party, the bed layout, the room and who booked it, under its guest.
    And The bed layout is offered in the lodge's own words rather than as a bed count the rooms do not all have.
    And The party is entered as its number of adults; there are no children or group fields.
    And Saving opens the new reservation for review.
