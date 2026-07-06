# id: z4gd1tHVEEF4Ryq8pJgb
@persona:front-desk-supervisor @status:done @priority:5 @reconciliation @adjustments @manual-workflow
Feature: preserve manual adjustment visibility

  As Front-desk supervisor
  I want to preserve manual adjustment visibility
  So that they can keep the adjustment work visible outside durable stored adjustments until a storage decision is approved

  Background:
    Given a front-desk supervisor is using manual staff-tip or coded adjustment handling during reconciliation

  Scenario: Acceptance criteria
    Then Manual staff-tip and coded adjustment work remains visible during reconciliation.
    And The workflow is not hidden behind durable stored adjustments before approval.
    And Staff can continue using the manual process while a storage decision is pending.
    And The process supports the lodge’s current reconciliation approach.
