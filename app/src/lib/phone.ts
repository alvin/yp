// Telephone numbers as the front desk types them.
//
// A number typed as bare digits is written back in the format the lodge's
// records already use — (250) 592-6029. Anything that is not a plain North
// American number is left exactly as it was typed: an overseas number, an
// extension, a note beside the number. Nothing already on file is rewritten,
// and search matches on digits either way (ypl.digits_only), so a number stored
// in any format is still found.

/** A typed number in the lodge's format, or unchanged if it is not one. */
export function formatPhone(value: string | null | undefined): string {
	const raw = (value ?? '').trim();
	if (!raw) return '';
	// Letters mean the clerk wrote something beside the number — "ext 12",
	// "cell" — and that is theirs to keep.
	if (!/^[\d\s().+-]+$/.test(raw)) return raw;

	const digits = raw.replace(/\D/g, '');
	if (digits.length === 10) {
		return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
	}
	if (digits.length === 11 && digits.startsWith('1')) {
		return `1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
	}
	if (digits.length === 7) {
		return `${digits.slice(0, 3)}-${digits.slice(3)}`;
	}
	return raw;
}
