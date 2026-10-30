@persona:operations-lead @status:done @priority:4 @admin @taxes @rates
Feature: set the tax rates

  As Operations lead
  I want the rates of the lodge's taxes listed with the dates each applies, and to add and correct them
  So that the charges on the transaction screen are taxed at the rates in force, without anyone editing the database

  Background:
    Given the admin login opens Taxes in the admin area

  Scenario: Acceptance criteria
    Then Taxes lists every rate of GST, PST, Liquor Tax, Room Tax and Destination Marketing Tax, newest first under each tax, with its rate and its From and To dates, as Access's tax rate form did.
    And The rate in force today is marked Current and one still to come is marked Upcoming; past rates are greyed.
    And Clicking a rate opens it in a drawer beside the list, to change its rate, its dates or its notes, as Access's Tax Rate Form did.
    And Add rate enters a new rate for a tax, from any day, today or ahead of time.
    And A new rate that starts while another is running, and runs at least as long, ends that one the day before; the drawer says so before it is saved.
    And Two rates of one tax can never cover the same day: the database refuses the change and names the rate in the way, however the rate is written.
    And A rate must be from 0% to under 100%, and end on or after the day it starts.
    And A rate can be removed until the day it starts, after confirming; the rate it ended runs on again, as the confirmation says. One that started before today can only be changed.
    And A charge is taxed at the rate of its own date, so charges dated before a change keep the rate they were posted at.
