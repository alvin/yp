@persona:operations-lead @status:done @priority:3 @admin @help
Feature: find step-by-step help in the admin area

  As Operations lead
  I want each admin page to explain its tasks that take several steps
  So that a rate change, a new room or a sales question can be done right without asking anyone

  Background:
    Given the admin login is on any page of the admin area

  Scenario: Acceptance criteria
    Then Every admin page has an info button beside its heading or in its top bar, which opens that page's help in a drawer from the right.
    And The help lists the page's tasks, each step by step, naming the buttons, tabs and fields as the screen shows them, in bold.
    And A page with more than a few tasks lists them first; clicking one jumps to it.
    And Every button, tab and field the help names exists on the admin screens, so the help can't describe a screen that has changed.
