import { describe, expect, it } from "vitest";
import { whatsAppsReducer } from "./index";

describe("whatsAppsReducer", () => {
	it("merges every live session field without losing connection configuration", () => {
		const state = [
			{
				id: 3,
				name: "osmar",
				number: "",
				status: "qrcode",
				disconnectReason: "stream_error_device_removed",
				disconnectCode: null,
				queues: [{ id: 1, name: "Principal" }],
			},
		];

		const result = whatsAppsReducer(state, {
			type: "UPDATE_SESSION",
			payload: {
				id: 3,
				number: "595986628334",
				status: "CONNECTED",
				qrcode: "",
				disconnectReason: null,
				disconnectCode: null,
				updatedAt: "2026-07-24T22:00:42.000Z",
			},
		});

		expect(result[0]).toMatchObject({
			id: 3,
			name: "osmar",
			number: "595986628334",
			status: "CONNECTED",
			qrcode: "",
			disconnectReason: null,
			disconnectCode: null,
		});
		expect(result[0].queues).toEqual([{ id: 1, name: "Principal" }]);
	});
});
