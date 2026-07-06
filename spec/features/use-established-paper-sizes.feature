# id: 88saGtLgQDc6K5Znbtqh
@persona:printing-coordinator @persona:front-desk-supervisor @status:done @priority:5 @printing @formatting @paper-sizes
Feature: use established paper sizes

  As Printing coordinator, Front-desk supervisor
  I want to use established paper sizes
  So that they receive output in the expected format for each document type

  Background:
    Given staff print guest documents and daily reports

  Scenario: Acceptance criteria
    Then Each document type prints in its established paper size.
    And The printed output stays consistent with the document’s normal layout.
    And Staff do not need to adjust paper size manually for each print job.
