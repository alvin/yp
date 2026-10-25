@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @reservation-history @segmentation @guest-context @in-house @future-stays
Feature: segment reservation history into future present in-house and past sections

  As Reservation clerk, Front-desk supervisor
  I want to segment reservation history into future present in-house and past sections
  So that they can understand the guest’s activity over time at a glance

  Background:
    Given staff review a guest’s reservation history

  Scenario: Acceptance criteria
    Then The guest's reservations are grouped under Present reservation (in house), Future reservations and Past reservations, in that order.
    And Each reservation appears only in the section that matches its stay: a stay running today is in house.
    And Each row shows its reservation number, its status, its arrival and departure dates and the rooms it holds; the stay in house is badged In house.
    And Every upcoming stay is listed, each on a row of its own, the furthest arrival first; past stays run most recent first too.
