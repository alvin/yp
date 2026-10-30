@persona:operations-lead @status:done @priority:4 @admin @pricing @inventory @taxes
Feature: maintain item prices

  As Operations lead
  I want every item the lodge charges for in a list, each opened in a form to change it
  So that prices and taxes can be changed, new items and item types added, and old items disabled, without anyone editing the database

  Background:
    Given the admin login opens Item Prices in the admin area

  Scenario: Acceptance criteria
    Then Item Prices has two tabs, Items and Item types; each is a list, and clicking a line opens it in a drawer beside the list, with the same fields, buttons and messages as the front desk's forms.
    And Items lists the active items in code order, with code, description, type, unit price and the taxes that apply; a search narrows the list, and Show disabled adds the disabled items, marked as such.
    And An item's drawer changes its code, description, type, unit price, which of GST, PST, liquor tax, room tax and DMT apply, and its notes, as Access's Inventory Form did; Add item enters a new one, and a code an active item already has is refused.
    And Any item can be disabled, sold or not: it leaves the charge picker and the list, its old charges keep naming it, and it can be enabled again.
    And A change to an item's price or taxes applies to charges posted after it is saved.
    And Item types lists each type with the daily cash line its items' charges post to and how many active items it has; Add item type adds one with its daily cash line, and a type's line can be changed. Room is not a line an item can post to.
