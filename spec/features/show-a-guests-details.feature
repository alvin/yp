@persona:reservation-clerk @persona:front-desk-supervisor @status:done @priority:5 @guest-profile @contact-details @name-search
Feature: show a guest's details

  As Reservation clerk, Front-desk supervisor
  I want to see a guest's details beside their reservation history
  So that the right guest is confirmed, and can be written to or called, without opening anything else

  Background:
    Given a staff member opens a guest from the name search results

  Scenario: Acceptance criteria
    Then Choosing a name match on the lookup screen opens the guest's page.
    And The page shows the guest's name and guest number once, beside their reservation history.
    And The address shows on its own line, then the city, province and postal code together, then the country.
    And Each phone on file shows with its type; a phone not on file leaves no line at all.
    And The email shows as a link that writes to it.
    And Each reservation in the history opens that reservation.
