import {createTransactionPool} from "../src";

describe("TransactionPool", () => {

	test("Works", () => {
		const pool = createTransactionPool();
		expect(pool.current).toBe(undefined);

		const transaction = pool.start();
		pool.setCurrent(transaction);
		expect(pool.current).toBe(transaction);

		pool.clearCurrent();
		expect(pool.current).toBe(undefined);
	});

});
