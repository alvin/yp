@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @charges @ledger @billing
Feature: post room-night and extra charges

  As Reservation clerk, Front-desk supervisor
  I want to post room-night and extra charges
  So that the stay balance reflects the right room and incidental charges

  Background:
    Given staff need to add stay charges for a reservation

  Scenario: Acceptance criteria
    Then Room-night charges can be added for the reservation.
    And Extra charges can be added for the reservation.
    And Each charge line can be entered with a date and a quantity.
    And The reservation total updates to include the posted charge lines.
    And A room-night charge shows the room's rate for the charge date before it is posted, and the clerk can type over it.
    And A room night is priced at the rate the desk chooses — Double, Single or Split — starting on Double. They are the rates Access called Regular, Special and Split: the rate for two, the rate for one, and half the rate for two.
    And An extra charge posts to its daily cash category (a wine to Liquor), whether it is added on screen or straight in the database.
    And A charge line carries no notes, as in Access: it shows its item, or Room and the room's name.
