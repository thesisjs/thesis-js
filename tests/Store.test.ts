import {Store} from "../src";
import {TransactionPool} from "../src/classes/TransactionPool";

describe("Store", () => {

	test("Data storing", () => {
		const store = new Store(new TransactionPool());

		store.set(undefined, "name", "Mae");
		store.set(undefined, "balance", 42);

		expect(
			store.get(undefined, "name"),
		).toBe("Mae");

		expect(
			store.get(undefined, "balance"),
		).toBe(42);
	});

	test("Transaction isolation", () => {
		const pool = new TransactionPool();
		const store = new Store(pool);

		store.set(undefined, "name", "Mae");

		const transaction = pool.start();
		store.set(transaction, "name", "Bea");

		expect(
			store.get(undefined, "name"),
		).toBe("Mae");

		expect(
			store.get(transaction, "name"),
		).toBe("Bea");

		transaction.commit();

		expect(
			store.get(undefined, "name"),
		).toBe("Bea");

		// Чтение после коммита работает
		expect(
			store.get(transaction, "name"),
		).toBe("Bea");
	});

	test("Transaction updating", () => {
		const pool = new TransactionPool();
		const store = new Store(pool);
		const transaction = pool.start();

		store.set(transaction, "name", "Mae");
		transaction.update(-1);

		// Случайно не закоммитили
		expect(
			store.get(undefined, "name"),
		).toBe(undefined);

		// Данные по новому id есть
		expect(
			store.get(transaction, "name"),
		).toBe("Mae");

		transaction.commit();

		// Закоммитили
		expect(
			store.get(undefined, "name"),
		).toBe("Mae");
	});

});
