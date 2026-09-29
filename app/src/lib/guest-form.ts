// A guest's details as the booking screen and the guest page edit them. Every
// field is text; an empty field is saved as empty. Loaded from the full guest
// record, so saving it back leaves the fields a screen doesn't show as they
// were.

import type { Guest } from './data/types.js';

export interface GuestForm {
	salutation: string;
	firstName: string;
	lastName: string;
	address: string;
	city: string;
	region: string;
	country: string;
	postal: string;
	phone: string;
	phoneType: string;
	secondaryPhone: string;
	secondaryPhoneType: string;
	email: string;
}

/** The form for a guest on file, or an empty one for a new guest. */
export function guestForm(g?: Guest | null): GuestForm {
	return {
		salutation: g?.guestsalutation ?? '',
		firstName: g?.guestfirstname ?? '',
		lastName: g?.guestlastname ?? '',
		address: g?.guestaddress ?? '',
		city: g?.guestcity ?? '',
		region: g?.guestregion ?? '',
		country: g?.guestcountry ?? (g ? '' : 'CAN'),
		postal: g?.guestpczip ?? '',
		phone: g?.guestprimaryphone ?? '',
		phoneType: g?.guestprimaryphonetype ?? '',
		secondaryPhone: g?.guestsecondaryphone ?? '',
		secondaryPhoneType: g?.guestsecondaryphonetype ?? '',
		email: g?.guestemailaddress ?? ''
	};
}
