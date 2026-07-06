# id: njioRUoEiDdShnYxw5Mx
@persona:operations-lead @status:done @priority:5 @manual-sales-list @room-order @daily-review
Feature: preserve room order sequencing

  As Operations lead
  I want to preserve room order sequencing
  So that staff can review room charges in the same room sequence they expect from the current paper workflow

  Background:
    Given a manual sales list is prepared for daily review

  Scenario: Acceptance criteria
    Then Rooms appear in room-number order on the list.
    And The ordering matches the established daily review sequence used by the team.
    And No room is moved out of sequence when the list is printed or viewed on screen.
