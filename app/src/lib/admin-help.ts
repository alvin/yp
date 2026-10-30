// The admin area's instructions, page by page: each task that takes more than
// a click, step by step, shown in a drawer behind the page's info button.
//
// **Name** marks a button, tab, field or menu by the name it shows on the
// screen. tests/features/find-step-by-step-help-in-the-admin-area.test.ts
// checks every one of them still exists on the admin screens, so the
// instructions can't drift from what they describe.

export interface HelpSection {
	title: string;
	/** Lines before the steps. */
	text?: string[];
	/** Numbered steps. */
	steps?: string[];
	/** Lines after the steps. */
	after?: string[];
}

export interface HelpPage {
	title: string;
	sections: HelpSection[];
}

export type HelpPageKey = 'sales' | 'itemPrices' | 'rooms' | 'taxes' | 'yearEnd';

export const HELP: Record<HelpPageKey, HelpPage> = {
	sales: {
		title: 'Sales Reports',
		sections: [
			{
				title: 'How many of an item were sold',
				steps: [
					'Set **From** and **To** at the top to the days wanted, such as June 1 to August 31 for the summer.',
					'Click **Selected**.',
					'Open **Items** and type part of the item’s name or code, such as hoodie.',
					'Click **Select all results**, or tick the items one at a time.',
					'Press Esc to close the list. Each item’s subtotal line gives how many were sold (Qty:) and the total.'
				]
			},
			{
				title: 'A whole kind of item, leaving some out',
				steps: [
					'Click **Selected**.',
					'Open **Item types** and tick the kind, such as Shirts and Clothing. Every item of that kind is ticked.',
					'Open **Items** and untick the ones to leave out, such as the caps. The kind shows as partly ticked.',
					'To add items of another kind, tick them in **Items**, or tick their kind in **Item types**.'
				]
			},
			{
				title: 'Every item',
				text: ['Click **All items**. It lists everything cashed out between the two dates.']
			},
			{
				title: 'Start over',
				text: [
					'Click **Clear** on the bar to untick everything. Inside a dropdown, **Clear** unticks what it lists; with something typed in its search, **Clear results** unticks only the matches.'
				]
			},
			{
				title: 'Printing and coming back to a report',
				text: [
					'Click **Print**. The dates, the tab and the items ticked stay in the page’s address, so reloading the page or a bookmark brings the same report back.'
				]
			},
			{
				title: 'What is counted',
				text: [
					'A sale counts on the day it was cashed out: the guest’s check-out day, as on the daily Items Cashed Out. Room nights aren’t listed.',
					'The dropdowns list only the items sold between the two dates. Changing the dates unticks an item those days didn’t sell.'
				]
			}
		]
	},

	itemPrices: {
		title: 'Item Prices',
		sections: [
			{
				title: 'Change an item’s price, taxes or notes',
				steps: [
					'In **Items**, type part of the item’s code or description in the search box above the list.',
					'Click its line. Its details open on the right.',
					'Change its **Unit price**, tick or untick its taxes, or edit its **Notes**.',
					'Click **Save item**.'
				],
				after: [
					'Charges posted from then on use the new price and taxes. Charges already posted keep theirs.'
				]
			},
			{
				title: 'Add an item',
				steps: [
					'Click **Add item**.',
					'Enter its **Code** (up to 5 characters), **Description**, **Type** and **Unit price**, and tick the taxes that apply.',
					'Click **Add item**.'
				],
				after: [
					'A code another active item already has is refused. The front desk sees the item in its charge list once its screen is reloaded.'
				]
			},
			{
				title: 'Stop selling an item',
				steps: [
					'Click the item’s line, then **Disable item**. It leaves the front desk’s charge list; charges already posted keep naming it.',
					'To sell it again, tick **Show disabled**, click its line, then **Enable item**.'
				]
			},
			{
				title: 'Add a kind of item',
				steps: [
					'Click **Item types**, then **Add item type**.',
					'Enter its **Name** and choose its **Daily cash line**: the line of the Daily Cash Activity Report its items’ sales are added to, such as Hats/Shirts or Liquor.',
					'Click **Add item type**.',
					'In **Items**, open each item of that kind and choose the new **Type**.'
				],
				after: ['To change the line a type’s sales go to, click the type in **Item types**.']
			}
		]
	},

	rooms: {
		title: 'Rooms & Rates',
		sections: [
			{
				title: 'How a room’s rates work',
				text: [
					'Each room has its own Double, Single and Split rates, and each runs **From** one day **To** another. A room night is charged at the rate in force on the charge’s date.',
					'A room can’t have two Double rates (or two Single, or two Split) on the same day: saving one is refused, and the message names the rate in the way.',
					'A rate code, such as R01 · Night for Two - Private Cottage, labels a rate; rooms priced alike share a code.'
				]
			},
			{
				title: 'Set next season’s prices for a group of rooms',
				steps: [
					'In **Rooms**, click **Add rate** above the list.',
					'Choose the **Rate code**, such as R01. The rooms at that code and its rate (Double) are filled in, and the rooms are named under **Rooms**.',
					'Add or remove rooms in **Rooms** if needed.',
					'Enter the **Price per night**.',
					'Set **From** to the first day of the new price. **To** is filled in with the day the current rate ends.',
					'Read the line under the dates: it says which rates end the day before.',
					'Click **Add rate**.',
					'Do the same for the Single and Split rates, which have codes of their own.'
				]
			},
			{
				title: 'Change one room’s price from a date',
				steps: [
					'Click the room, then **Add rate** under its rates.',
					'Choose the **Rate**: Double, Single or Split. Its **Rate code** is filled in.',
					'Enter the **Price per night** and the **From** date. **To** is filled in.',
					'Click **Add rate**.'
				]
			},
			{
				title: 'Correct a rate',
				steps: [
					'Click the room, then the rate.',
					'Change its **Price per night**, dates, **Rate code** or **Notes**.',
					'Click **Save rate**.'
				],
				after: [
					'This changes the rate itself, for every day it covers. For a price that changes from a date, add a rate instead.'
				]
			},
			{
				title: 'Undo a rate entered by mistake',
				steps: [
					'Click the room, then the rate.',
					'Click **Remove**, then **Remove rate**. The rate it ended runs on again, as the confirmation says.'
				],
				after: [
					'A rate can be removed up to the day it starts. One that started earlier can be corrected, but not removed.',
					'A rate put on several rooms at once is removed from each room in turn.'
				]
			},
			{
				title: 'Add a room',
				steps: [
					'For a new kind of room, add its type first in **Room types**. For a room priced unlike any other, add its rate codes in **Rate codes**.',
					'In **Rooms**, click **Add room**.',
					'Enter its **Room name** and **Room #**, choose its **Room type**, and fill in its **Room shorthand** (its beds, such as Q+DH), **Room code** and **Sort order**.',
					'The **Sort order** places it on every list and report: 14.5 puts it between the rooms at 14 and 15.',
					'Tick its taxes and click **Add room**. The panel stays on the new room.',
					'Click **Add rate** and enter its Double rate. Do the same for Single and Split.'
				],
				after: ['The front desk sees the room in its lists once its screen is reloaded.']
			},
			{
				title: 'Change a room’s details or taxes',
				steps: [
					'Click the room.',
					'Change its details, or tick or untick its taxes. A room’s taxes apply on all its rates.',
					'Click **Save room**.'
				]
			},
			{
				title: 'Take a room out of use',
				steps: [
					'Click the room, then **Disable room**. It leaves the front desk’s room lists; stays already booked in it keep it.',
					'To use it again, tick **Show disabled**, click the room, then **Enable room**.'
				]
			},
			{
				title: 'Add or relabel a rate code',
				steps: [
					'Click **Rate codes**, then **Add rate code**.',
					'Enter the **Code** (up to 5 characters) and its **Description**, such as Night for Two - New Cabin.',
					'Click **Add rate code**. It can then be chosen for any room’s rate.'
				],
				after: [
					'To relabel a code, click it, change its **Description** and click **Save rate code**. The code itself can’t be changed, since the rates carry it.'
				]
			},
			{
				title: 'Add a room type',
				steps: [
					'Click **Room types**, then **Add room type**.',
					'Enter its **Name** and click **Add room type**. It can then be chosen as a room’s **Room type**.'
				]
			}
		]
	},

	taxes: {
		title: 'Taxes',
		sections: [
			{
				title: 'How tax rates work',
				text: [
					'Each tax has rates that run **From** one day **To** another, listed newest first. A charge is taxed at the rate in force on its date. The rate in force today is marked Current; one still to come, Upcoming.',
					'Two rates of one tax can’t cover the same day: saving one is refused, and the message names the rate in the way.'
				]
			},
			{
				title: 'Change a tax from a date',
				steps: [
					'Click **Add rate**.',
					'Choose the **Tax**, enter the new **Rate (%)** and set **From** to the day it starts.',
					'**To** is filled in with the day the current rate ends. Keep it.',
					'Read the line under the dates: the current rate ends the day before.',
					'Click **Add rate**.'
				]
			},
			{
				title: 'A rate for a few weeks, such as a tax holiday',
				steps: [
					'Click the current rate and note its **To** date.',
					'Set its **To** to the day before the holiday and click **Save rate**.',
					'Click **Add rate**, choose the tax, enter the holiday rate with its **From** and **To**, and click **Add rate**.',
					'Click **Add rate** again, choose the tax, enter the usual rate **From** the day after the holiday **To** the date noted, and click **Add rate**.'
				]
			},
			{
				title: 'Correct a rate',
				steps: [
					'Click the rate.',
					'Change its **Rate (%)**, dates or **Notes**.',
					'Click **Save rate**.'
				],
				after: [
					'Charges already posted keep the tax they were posted with. A charge changed later is taxed again at the rate of its date.'
				]
			},
			{
				title: 'Undo a rate entered by mistake',
				steps: [
					'Click the rate.',
					'Click **Remove**, then **Remove rate**. The rate it ended runs on again, as the confirmation says.'
				],
				after: [
					'A rate can be removed up to the day it starts. One that started earlier can be corrected, but not removed.'
				]
			}
		]
	},

	yearEnd: {
		title: 'Year End Deposits',
		sections: [
			{
				title: 'The year end',
				steps: [
					'The report opens on January 1 to December 31 of this year.',
					'Month by month, it lists the deposits received for stays arriving after December 31: how many, how much was received, refunded and kept, and what is still held.',
					'What is still held at December 31 is at the foot. Click **Print**.'
				]
			},
			{
				title: 'Another stretch of days',
				text: [
					'Change **From** and **To** at the top. It then counts the deposits received in those days, for stays arriving after the **To** date, and the refunds and deposits kept in those days.'
				]
			},
			{
				title: 'What isn’t counted',
				text: ['The $0.00 deposit lines Access added to new bookings aren’t counted as deposits.']
			}
		]
	}
};
