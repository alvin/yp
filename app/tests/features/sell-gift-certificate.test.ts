// Story: spec/features/sell-gift-certificate.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, staffClient, unwrap, type Fixture } from '../helpers/db';

let fx: Fixture;

beforeAll(async () => {
	fx = await makeReservation();
	await rpc('sell_gift_certificate', {
		p_reservationguestid: fx.reservationguestid,
		p_amount: 300,
		p_paymenttype: 'Visa',
		p_date: fx.arrival
	});
});

describe('sell gift certificate', () => {
	it('records the sale from the transaction workspace RPC', async () => {
		const client = await staffClient();
		const tx = unwrap(
			await client
				.from('transactions')
				.select('transtype, transamount')
				.eq('reservationguestid', fx.reservationguestid)
				.eq('transtype', 'Gift Certificate')
		) as { transamount: number }[];
		expect(tx).toHaveLength(1);
		expect(Number(tx[0].transamount)).toBe(300);
	});

	it('treats the sale as charge-side activity', async () => {
		const upper = await rpc<{ group_name: string; item: string; amount: number }[]>(
			'report_dcar_upper',
			{ p_date: fx.arrival }
		);
		const row = upper.find((r) => r.group_name === 'Revenue' && r.item === 'Gift Certificate');
		expect(Number(row?.amount)).toBe(300);
	});

	it('contributes to daily cash reporting on both sides', async () => {
		const receipts = await rpc<number>('report_dcar_receipts_total', { p_date: fx.arrival });
		expect(Number(receipts)).toBe(300);
		const total = await rpc<number>('report_dcar_total', { p_date: fx.arrival });
		expect(Number(total)).toBe(300);
	});

	it('remains part of the reservation office workflow (ledger)', async () => {
		const rows = await rpc<{ line_type: string }[]>('reservation_ledger', {
			p_reservationid: fx.reservationid
		});
		expect(rows.some((r) => r.line_type === 'Gift Certificate')).toBe(true);
	});
});
