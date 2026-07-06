# id: lcsGcOqDk0BaUmaBKfCx
@persona:printing-coordinator @status:done @priority:5 @printing @shared-process @document-types
Feature: generate guest-document queues through shared queue service by output type and date

  As Printing coordinator
  I want to generate guest-document queues through shared queue service by output type and date
  So that staff can produce the right print queues consistently from one shared process

  Background:
    Given the office needs guest-document batches prepared by document type and day

  Scenario: Acceptance criteria
    Then A staff member can create a queue by choosing a document type and a date.
    And The same queueing process works across the supported guest document types.
    And The queue is built from the selected date only.
    And The resulting queue can be used for printing without extra manual rework.
