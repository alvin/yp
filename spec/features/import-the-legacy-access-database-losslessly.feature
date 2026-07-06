@persona:operations-lead @status:done @priority:5 @migration @access @import
Feature: import the legacy Access database losslessly

  As Operations lead
  I want to import the legacy Access database losslessly
  So that the lodge's full history moves to the new system unchanged

  Background:
    Given the migration tooling exports the production Access database

  Scenario: Acceptance criteria
    Then Every Access table loads into the new schema with all rows preserved.
    And Historical values load byte-for-byte, without recalculation or policy checks rewriting them.
    And Invalid Access zero dates import as empty rather than failing the load.
    And Identity sequences and the reservation-number counter continue past the imported data.
    And Imported data keeps full referential integrity between guests, reservations, charges, and payments.
