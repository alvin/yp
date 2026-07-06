// Story: spec/features/record-multiple-guest-names.feature
import { beforeAll, describe, expect, it } from 'vitest';
import { makeReservation, rpc, staffClient, uid, unwrap, type Fixture } from '../helpers/db';

let fx: Fixture;
let secondName: string;

beforeAll(async () => {
	fx = await makeReservation();
	secondName = `ZZSecond-${uid()}`;
	const g2 = await rpc<number>('create_guest', { p_lastname: secondName, p_firstname: 'Jo' });
	await rpc('add_reservation_guest', { p_reservationid: fx.reservationid, p_guestid: g2 });
});

describe('record multiple guest names', () => {
	it('stores more than one guest name against the same reservation', async () => {
		const client = await staffClient();
		const rgs = unwrap(
			await client
				.from('v_reservation_guest_summary')
				.select('guest_name')
				.eq('reservationid', fx.reservationid)
		) as { guest_name: string }[];
		expect(rgs.length).toBe(2);
	});

	it('shows every guest name when the reservation is opened', async () => {
		const client = await staffClient();
		const rgs = unwrap(
			await client
				.from('v_reservation_guest_summary')
				.select('guest_name')
				.eq('reservationid', fx.reservationid)
		) as { guest_name: string }[];
		const names = rgs.map((r) => r.guest_name).join(' ');
		expect(names).toContain(fx.lastname);
		expect(names).toContain(secondName);
	});

	it('still finds and manages the stay as one reservation', async () => {
		const found = await rpc<{ resnumber: number }[]>('find_reservation', {
			p_resnumber: fx.resnumber
		});
		expect(found).toHaveLength(1);
	});

	it('includes the recorded names on printed reservation documents', async () => {
		const conf = await rpc<{ guest_names: string }[]>('report_reservation_confirmation', {
			p_reservationid: fx.reservationid
		});
		expect(conf[0].guest_names).toContain(fx.lastname);
		expect(conf[0].guest_names).toContain(secondName);
	});
});
