// Story: spec/features/convert-us-funds-to-canadian-automatically.feature

import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, staffClient, todayISO, unwrap, type Fixture } from '../helpers/db';

interface Pay {
	paymentid: number;
	paymentcode: string;
	paymentamount: number;
	paymentamountcdn: number;
}

async function getPay(id: number): Promise<Pay> {
	const client = await staffClient();
	const rows = unwrap(await client.from('payments').select('*').eq('paymentid', id)) as Pay[];
	return rows[0];
}

describe('convert US funds to Canadian automatically', () => {
	let fx: Fixture;
	const today = todayISO();

	beforeAll(async () => {
		fx = await makeReservation();
	});

	it('fills the CDN amount from the effective exchange rate for US payments', async () => {
		const rate = await rpc<number>('effective_exchange_rate', { p_date: today });
		const id = await rpc<number>('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Payment (Regular)',
			p_paymenttype: 'U.S. Cash',
			p_amount: 100,
			p_currency: 'US',
			p_paymentdate: today
		});
		const pay = await getPay(id);
		expect(pay.paymentamountcdn).toBe(Math.round(100 * rate * 100) / 100);
	});

	it('copies the amount for Canadian payments', async () => {
		const id = await rpc<number>('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Payment (Regular)',
			p_paymenttype: 'Cash',
			p_amount: 88.5,
			p_currency: 'Canadian',
			p_paymentdate: today
		});
		expect((await getPay(id)).paymentamountcdn).toBe(88.5);
	});

	it('recalculates the CDN value when amount or currency changes', async () => {
		const id = await rpc<number>('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Payment (Regular)',
			p_paymenttype: 'Cash',
			p_amount: 10,
			p_currency: 'Canadian',
			p_paymentdate: today
		});
		const client = await staffClient();
		unwrap(await client.from('payments').update({ paymentamount: 40 }).eq('paymentid', id).select());
		expect((await getPay(id)).paymentamountcdn).toBe(40);

		const rate = await rpc<number>('effective_exchange_rate', { p_date: today });
		unwrap(
			await client.from('payments').update({ paymentcurrency: 'US' }).eq('paymentid', id).select()
		);
		expect((await getPay(id)).paymentamountcdn).toBe(Math.round(40 * rate * 100) / 100);
	});

	it('derives the payment code from the category', async () => {
		const id = await rpc<number>('record_payment', {
			p_reservationguestid: fx.reservationguestid,
			p_paymentcategory: 'Deposit (Received)',
			p_paymenttype: 'Visa',
			p_amount: 55,
			p_paymentdate: today
		});
		expect((await getPay(id)).paymentcode).toBe('D01');
	});
});
