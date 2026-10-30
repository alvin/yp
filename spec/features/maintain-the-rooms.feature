@persona:operations-lead @status:done @priority:4 @admin @rooms @pricing @taxes
Feature: maintain the rooms

  As Operations lead
  I want the rooms, their rates and the lists they use, as Access's Room form and lookup tables kept them
  So that rooms can be added, changed and disabled, and given their rates, ahead of time or for several rooms at once, without anyone editing the database

  Background:
    Given the admin login opens Rooms & Rates in the admin area

  Scenario: Acceptance criteria
    Then Rooms & Rates has three tabs: Rooms, Rate codes and Room types.
    And Rooms lists every active room in the lodge's sort order, with its type, shorthand, the Double, Single and Split rates it is charged today, its taxes and its sort order; Show disabled adds the disabled rooms, marked as such.
    And A room opens in a drawer with its details, as on Access's Room form: room name, room #, room type, sort order, room code, room shorthand, room notes, and which of GST, PST, room tax and DMT apply on its nights.
    And Under them are the room's own rates, each rate's newest first, with its rate (Double, Single or Split), code, price per night, From and To dates, and Current or Upcoming; a rate opens in the same drawer, with a way back to the room.
    And Add room enters a new room; once added, the drawer stays on it to give it its first rates. Two rooms can't share a name and number, or a sort order; a decimal sort order places a room between two others.
    And Any room can be disabled: it leaves the front desk's room lists, its stays keep it, and it can be enabled again.
    And A room's rate is added from any day, ahead of time included; the room's rate of that type running when it starts, and ending no later than it does, ends the day before, and the drawer says so before saving. Two rates of one type on a room can never cover the same day: the database refuses and names the rate in the way.
    And Add rate on the list puts one new rate on several rooms at once, as Access's Append Room Rates did; the rooms are chosen by name, and picking a rate code ticks the rooms charged at it now, and the rate they are at, both of which can be changed. The drawer names the rooms chosen.
    And A rate can be removed until the day it starts, after confirming; the rate it ended runs on again, as the confirmation says.
    And Rate codes lists each code with what it stands for and how many active rooms have a rate at it today or later; Add rate code adds one, and a code's description can be changed.
    And Room types lists each type with how many active rooms are of it; Add room type adds one.
