# id: vFr39WHp8nwRo51KUdT2
@persona:reservation-clerk @status:done @priority:5 @printing @documents @workflow
Feature: provide print paths

  As Reservation clerk
  I want to provide print paths
  So that they can handle both grouped and single-document output without changing the current lodge process

  Background:
    Given reservation staff need to produce guest documents from the shared printing workflow

  Scenario: Acceptance criteria
    Then Staff can choose a grouped print path for supported guest document actions.
    And Staff can choose a single-document print path for supported guest document actions.
    And The available print choice matches the document type being produced.
    And The workflow keeps the familiar paper-based process intact.
