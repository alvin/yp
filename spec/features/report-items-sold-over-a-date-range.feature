@persona:operations-lead @persona:daily-cash-reviewer @status:done @priority:4 @admin @sales @items @reporting
Feature: report items sold over a date range

  As Operations lead, Daily cash reviewer
  I want the Items Cashed Out report over any range of days, for every item or only the ones I choose
  So that questions like "how many zip-up hoodies did we sell over the summer?" or "what liquor did we sell in October?" have an answer on paper

  Background:
    Given the admin login opens Sales Reports in the admin area

  Scenario: Acceptance criteria
    Then Sales is the Items Cashed Out report between a From and a To date in its top bar, this month so far to start with.
    And Each line shows the day it was cashed out, with a subtotal for each item code, its quantity among them, and the report's totals.
    And A line is counted on the day it is cashed out, its stay's check-out day, exactly as on the daily Items Cashed Out appendix; room nights are left out.
    And Two tabs in the top bar switch between All items, the whole report, and Selected.
    And Selected has a bar with two dropdowns that tick several entries at once, Item types and Items (grouped by type), each entry with a tick box and how many were sold. The report lists only the items ticked.
    And Ticking a type ticks every item of that type, and each item can then be cleared on its own, so all the garments without the hats, or all the beer without the wine, can be chosen. A type partly chosen shows a partly ticked box, and its button reads "Part of" the type.
    And Each dropdown has Select all and Clear; once something is typed into its search they act on the matches alone, as Select all results and Clear results.
    And Each button sums up what is chosen: a name, "All items" or "All types", or how many are chosen. Clear on the bar clears every item chosen.
    And What is chosen is always among the items sold in the dates; new dates drop an item they didn't sell.
    And The dates, the tab and the items chosen are kept in the address, so a reload or a print keeps them.
