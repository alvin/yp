@persona:printing-coordinator @persona:front-desk-supervisor @persona:reservation-clerk @status:done @priority:5 @printing @reprint @guest
Feature: reprint guest document by guest

  As Printing coordinator, Front-desk supervisor, Reservation clerk
  I want to reprint guest document by guest
  So that they can quickly generate the correct document again without rebuilding the whole batch

  Background:
    Given a staff member needs to print a confirmation, folio, bill, or cancellation notice for one guest

  Scenario: Acceptance criteria
    Then In the Print Center a staff member can find one guest by name, see that guest's stays, and open the chosen document for one of them.
    And A document can also be opened there by its reservation number.
    And The reprint is the same document, built from the same stay, as any other print of it.
    And The document opened names its guest and reservation number, and its tab is marked as the document showing.
    And Each of the stay's other documents is a tab away; a cancellation notice only for a cancelled stay.
    And The reservation screen opens each of its documents to print as well, a cancellation notice only for a cancelled stay.
