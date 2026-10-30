@persona:operations-lead @status:done @priority:5 @migration @access @import
Feature: import the legacy Access database

  As Operations lead
  I want to import every Access table the system uses, row for row
  So that the lodge's history moves to the new system unchanged, without the Access tables nothing uses

  Background:
    Given the migration tooling exports the production Access database

  Scenario: Acceptance criteria
    Then Every Access table the system uses loads into the new schema with all rows preserved.
    And Every other Access table stays in the Access file and has no table in the new schema; the export stops on an Access table it has no decision for.
    And Without an Access file, the seed sets up the rooms and their rates, the price list, the tax and exchange rates and the pick lists the system uses, and nothing else: no guest, booking, charge or payment records, no Access user list and no Access settings.
    And Every table that is loaded or seeded is read by the system.
    And Historical values load byte-for-byte, without recalculation or policy checks rewriting them.
    And Invalid Access zero dates import as empty rather than failing the load.
    And Identity sequences and the reservation-number counter continue past the imported data.
    And Imported data keeps full referential integrity between guests, reservations, charges, and payments.
