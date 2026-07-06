Feature: Lookup Screen
  The lookup screen is the front desk home screen.
  It opens records from the production Supabase schema by guest
  name, reservation number, date, or all-fields query, and starts new reservation
  and print/report flows.

  Background:
    Given Supabase stores production data in `ypl` tables that preserve the Access columns and values
    And guest search reads `ypl.guests` through `ypl.search_guests_by_name`
    And reservation lookup reads `ypl.reservations.resnumber` through `ypl.find_reservation`
    And date lookup reads `ypl.reservations` and `ypl.room_assignments` through `ypl.search_by_date`

  Scenario: Open the lookup home screen and see the primary entry points
    Given the front desk user opens the system
    When the lookup screen is shown
    Then the user sees a name search field
    And the user sees a reservation number field
    And the user sees a date search field
    And the user sees a New Reservation action
    And the user sees a Print Menu action
    And the user sees a Daily Cash Report action
    And the user sees a Search All Fields (Query) action

  Scenario: Start a new reservation from the lookup screen
    Given the lookup screen is shown
    When the user selects New Reservation
    Then a blank transaction screen is opened
    And the guest information area can be empty for a new guest
    And saving the new stay creates compatible rows in `ypl.guests`, `ypl.reservations`, `ypl.reservation_guests`, and `ypl.room_assignments` as needed

  Scenario: Find a guest by entering a partial surname string
    Given the lookup screen is shown
    When the user enters part of a guest surname
    Then matching guest names can be returned from `ypl.guests.guestlastname`
    And matches can also consider `ypl.guests.guestfirstname` and `ypl.guests.guestcompany`

  Scenario: Narrow name search results by entering additional characters
    Given the lookup screen is shown
    When the user enters more characters in the name search field
    Then the list of matching names becomes smaller
    And the search remains a partial-string search rather than an exact surname-only lookup

  Scenario: Open an existing reservation by reservation number
    Given the lookup screen is shown
    When the user enters an existing reservation number
    Then the matching `ypl.reservations.resnumber` is found
    And the matching reservation workflow is opened

  Scenario: Search reservations by the default arrival date mode
    Given the lookup screen is shown
    When the user selects a date without choosing another date-search mode
    Then the user is taken to the date search results screen
    And results are based on `ypl.reservations.resarrivaldate`

  Scenario: Search reservations by departure or in-house occupancy date when requested
    Given the lookup screen is shown
    When the user selects a date search mode for departures, both arrival/departure, or in-house occupancy
    Then the date search uses `ypl.reservations.resdeparturedate` or `ypl.room_assignments` date ranges as appropriate
    And each result identifies the date match type

  Scenario: Search reservations across a selected date range
    Given the lookup screen is shown
    When the user searches across a date range
    Then reservations can be returned for that selected range
    And the range can be interpreted as arrival, departure, occupancy, or overlapping-stay mode

  Scenario: Run an all-fields query from the lookup screen
    Given the lookup screen is shown
    When the user runs the visible Search All Fields (Query) action
    Then reservation and guest records can be searched by other stored fields such as phone number, address, email, or reservation number
    And the query uses `ypl.search_all_fields` over the production schema

  Scenario: Open the print menu from the lookup screen
    Given the lookup screen is shown
    When the user selects Print Menu
    Then the print screen is opened

  Scenario: Open daily cash reporting from the lookup screen
    Given the lookup screen is shown
    When the user selects Daily Cash Report
    Then the daily cash reporting workflow is opened
    And calculated report data comes from `ypl.transactions`, `ypl.payments`, and the lookup tables
