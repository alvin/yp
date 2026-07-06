# id: SkEoGqAydEhcwcrsWdW8
@persona:printing-coordinator @persona:front-desk-supervisor @status:done @priority:5 @printing @reprint @guest
Feature: reprint guest document by guest

  As Printing coordinator, Front-desk supervisor
  I want to reprint guest document by guest
  So that they can quickly generate the correct document again without rebuilding the whole batch

  Background:
    Given a staff member needs to print a confirmation, folio, bill, or cancellation notice for one guest

  Scenario: Acceptance criteria
    Then A staff member can select one guest and view that guest’s available documents for reprinting.
    And A staff member can choose one document and send only that document to print.
    And The reprint uses the same guest information and document content that was previously issued.
    And The staff member can tell which guest and document were reprinted before leaving the screen.
