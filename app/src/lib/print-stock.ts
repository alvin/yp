// The paper each printed output goes on. The lodge keeps two stocks loaded on
// two printers: letter for the daily reports, A5 "folio" paper for the guest
// slips. A browser cannot choose which printer a page goes to, so the batch
// prints one stock at a time — each print action carries its own page size, and
// the operator sends it to the tray that holds that paper.

export type PaperStock = 'letter' | 'a5';

/** What the front desk calls each stock. */
export const STOCK_LABEL: Record<PaperStock, string> = {
	letter: 'Reports',
	a5: 'Folios'
};

/** The CSS `@page size` for a stock and orientation. */
export function pageSize(stock: PaperStock, orientation: 'portrait' | 'landscape'): string {
	return `${stock === 'a5' ? 'A5' : 'letter'} ${orientation}`;
}
