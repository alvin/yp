# id: Gio4YXjigpeBZjmpWKgz
@persona:printing-coordinator @persona:front-desk-supervisor @status:done @priority:4 @print @navigation @documents
Feature: open print menu

  As Printing coordinator, Front-desk supervisor
  I want to open print menu
  So that they can reach printing options from the home screen

  Background:
    Given front-desk staff need access to paper-based documents

  Scenario: Acceptance criteria
    Then A print menu is available from the home screen
    And Opening it shows the available print actions
    And The print menu can be reached without leaving the lookup screen
