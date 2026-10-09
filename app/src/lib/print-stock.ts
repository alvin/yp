// The paper each printed output goes on. The lodge keeps two stocks loaded on
// two printers: letter for the daily reports, A5 "folio" paper for the guest
// slips. The folio paper is printed on the back for each kind of guest
// document — the waiver behind the check-in folio, the arrival instructions
// behind the confirmation, nothing behind the check-out bill — so each kind
// goes through on its own run of paper. A browser cannot choose which printer
// a page goes to, so each print action carries its own page size, and the
// operator sends it to the tray that holds that paper.

export type PaperStock = 'letter' | 'a5';

/** The CSS `@page size` for a stock and orientation. */
export function pageSize(stock: PaperStock, orientation: 'portrait' | 'landscape'): string {
	return `${stock === 'a5' ? 'A5' : 'letter'} ${orientation}`;
}
