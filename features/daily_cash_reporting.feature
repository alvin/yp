Feature: Daily Cash Reporting
  The daily cash reporting workflow preserves the Daily Cash Activity Report,
  its supporting appendix reports, and the manual balancing practices used by the
  lodge, using the Access transaction and payment categories as source of truth.

  Background:
    Given sales and charge data comes from `ypl.transactions` joined to `ypl.lookup_transaction_types`
    And tax totals come from `ypl.transactions` tax amount fields and `ypl.lookup_tax_rate_types`
    And payments, deposits, refunds, A/R, gift certificates, gratuities, and cash categories come from `ypl.payments` joined to `ypl.lookup_payment_categories` and `ypl.lookup_payment_types`
    And current Access data does not store the handwritten actual amount and adjustment columns as a durable table

  Scenario: Open daily cash reporting from the lookup screen
    Given the lookup screen is shown
    When the user selects Daily Cash Report
    Then the daily cash reporting workflow is opened

  Scenario: Keep the daily cash structure close to the current printed workflow
    Given the daily cash activity report is shown for a selected day
    When the office reviews the report and its appendices
    Then the daily cash report remains recognizably close to the current printed cash sheet
    And the appendix reports remain part of the daily cash workflow rather than being collapsed away
    And the categories remain traceable to the lookup tables

  Scenario: Review the revenue, tax, and adjustment section of the daily cash report
    Given the daily cash activity report is shown for a selected day
    When the user reviews the upper balancing section
    Then the user sees sales and charge categories from `ypl.lookup_transaction_types`
    And the user sees tax lines from `ypl.transactions` tax fields
    And the user sees balance-sheet-style payment categories from `ypl.lookup_payment_categories`

  Scenario: Preserve the sales and charge categories in the upper section
    Given the daily cash activity report is shown for a selected day
    When the user reviews the sales and charges
    Then the report can show Room, Liquor, Extra Meal, Gift Certificate, and other Access-derived transaction categories
    And the report shows a Total Sales and Charges line

  Scenario: Preserve the tax categories in the upper section
    Given the daily cash activity report is shown for a selected day
    When the user reviews the taxes retained
    Then the report can show GST, PST, HST, Liquor Tax, Room Tax, Hotel Tax, and Destination Marketing Tax lines
    And the report shows a Total Taxes line

  Scenario: Preserve the balance-sheet adjustment lines in the upper section
    Given the daily cash activity report is shown for a selected day
    When the user reviews the balance-sheet adjustments
    Then the report can show Deposit (Received) and Prepayment (Received) lines
    And the report can show Deposit (Refund) and Prepayment (Refund) lines
    And the report can show Deposit (Applied) and Prepayment (Applied) lines
    And the report can show a Deposit (Kept) line
    And the report can show A/R (Payment Received) and A/R (Sent To Accounts) lines
    And the report can show Gratuity, Gift Certificate Received, Paid Out, Donation, and Reimbursed by Staff lines where Access data uses them
    And deposit and prepayment applications can be recognized as positive upper-section lines
    And deposit and prepayment refunds can reduce the upper-section total
    And the report shows a Today's Revenue and Expenses total

  Scenario: Review the payments-by-type section of the daily cash report
    Given the daily cash activity report is shown for a selected day
    When the user reviews the lower balancing section
    Then the user sees payments received by payment type
    And the calculated amounts come from `ypl.payments.paymentamountcdn` where available
    And handwritten actual amounts and adjustments remain visible in the printed workflow even if not stored in the Access database

  Scenario: Preserve the tender types in the payments-by-type section
    Given the daily cash activity report is shown for a selected day
    When the user reviews payments received by type
    Then the report can show Mastercard, Visa, Amex, Debit Card, Cash, Cheque, and Traveller's Cheque tenders
    And the report can show U.S. Cash, U.S. Cheque, U.S. Traveller's Cheque, U.S. Exchange, Gift Certificate, None (Sent to A/R), Paid Out, and ICS Crossover tenders where present in `ypl.lookup_payment_types`
    And the report shows a Total Receipts Today line and a Balance Owed line

  Scenario: Convert US receipts to Canadian dollars on the daily cash report
    Given the daily cash activity report is shown for a selected day
    When the day includes receipts taken in US funds
    Then the report presents the converted value from `ypl.payments.paymentamountcdn`
    And exchange-rate history remains available from `ypl.exchange_rates`

  Scenario: Balance the upper and lower sections of the daily cash report
    Given the daily cash activity report is shown for a selected day
    When the user balances the day
    Then Today's Revenue and Expenses can be compared against Total Receipts Today
    And the two balancing sections are expected to agree after any manual handwritten adjustments

  Scenario: Trace daily cash figures to supporting appendix reports
    Given the daily cash activity report is shown for a selected day
    When the user needs supporting detail for the balances
    Then the workflow provides appendix reports behind the daily cash report

  Scenario: Preserve deposit and payment appendix reports within the reporting set
    Given daily cash reporting is produced for a selected day
    When supporting detail is reviewed
    Then deposits received are available as an appendix report
    And deposits applied are available as an appendix report
    And cashier detail is available as an appendix report
    And items cashed out are available as an appendix report

  Scenario: Group the deposit appendix reports by payment type with funds and Canadian value
    Given the deposits received or deposits applied appendix is produced for a selected day
    When the user reviews the deposit detail
    Then the appendix groups deposits by `ypl.payments.paymenttype`
    And each line shows reservation number, guest name, payment amount, funds, and Canadian-dollar amount
    And the appendix shows a total for the day

  Scenario: Subtotal the cashier detail appendix by payment type
    Given the cashier detail appendix is produced for a selected day
    When the user reviews the payment lines
    Then each line shows payment type, reservation number, payment date, payment category, amount, and guest reference
    And the appendix subtotals each payment type and shows a final total

  Scenario: Break out item and tax detail in the items cashed out appendix
    Given the items cashed out appendix is produced for a selected day
    When the user reviews the sold items
    Then the appendix groups items by inventory code from `ypl.inventory_items.invcode`
    And each line shows quantity, total, and a tax breakdown across GST, PST, HST, Destination Marketing Tax, Liquor, Room, and Hotel tax fields
    And the appendix subtotals each inventory code and shows report totals

  Scenario: Keep manual adjustments visible in the balancing workflow
    Given the daily cash activity report is shown for a selected day
    When a manual adjustment is needed
    Then the adjustment remains visible on the printed or rendered report workflow
    And the report continues to support manual balancing
    And adding durable in-app adjustment storage requires an explicit scope decision because the Access schema does not currently store those handwritten values

  Scenario: Preserve manual staff-tip and coded adjustment workflow outside production storage until approved
    Given the daily cash activity report is shown for a selected day
    When the office records staff tips, purchases, or extraordinary items outside the application
    Then the system preserves the existing handwritten or spreadsheet handoff workflow
    And in-app durable adjustment storage is not added unless the client approves that scope explicitly
