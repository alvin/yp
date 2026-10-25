@persona:printing-coordinator @status:done @priority:5 @printing @shared-process @document-types
Feature: generate guest-document queues through shared queue service by output type and date

  As Printing coordinator
  I want to generate guest-document queues through shared queue service by output type and date
  So that staff can produce the right print queues consistently from one shared process

  Background:
    Given the office needs guest-document batches prepared by document type and day

  Scenario: Acceptance criteria
    Then The Print Center has a tab for each guest document — Confirmation, Check-in folio, Check-out bill and Cancellation — listing that document's queue for the report date.
    And Every tab lists its queue the same way: each row names the guest, the reservation number and why it is queued.
    And Changing the report date rebuilds every list from the new date alone.
    And Each row opens its document, ready to print.
