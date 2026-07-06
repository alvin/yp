# id: PfkKVSzQD6z5qulbCOOF
@persona:front-desk-supervisor @status:done @priority:4 @reports @printing @notes @visibility
Feature: ensure reservation notes feed reports

  As Front-desk supervisor
  I want to ensure reservation notes feed reports
  So that staff can rely on the right wording appearing in the right places

  Background:
    Given a report needs reservation wording that is relevant to operations

  Scenario: Acceptance criteria
    Then Operational reports can include the wording that is intended for them.
    And Printed documents can include the wording that is intended for them.
    And Guest-only notes do not appear in outputs where they should be hidden.
    And The same reservation can support both operational use and printed output when appropriate.
