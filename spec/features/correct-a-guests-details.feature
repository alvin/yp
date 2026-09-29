@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:4 @guests @profile
Feature: correct a guest's details

  As Reservation clerk, Front-desk supervisor
  I want to correct a guest's name, address, phones and email
  So that confirmations and bills go to the right place without making a second guest record

  Background:
    Given a guest's details on file are out of date

  Scenario: Acceptance criteria
    Then The guest's page opens their details for editing, every field the front desk keeps.
    And A changed field is saved to the guest's record; an emptied field is cleared.
    And The last name can be changed but not left empty.
    And A title, phone type or other optional choice can be set back to none.
    And A value on file shows as it is, even one no longer on the lodge's lists.
