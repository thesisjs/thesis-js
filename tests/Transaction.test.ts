import {Store} from "../src";
import {TransactionPool} from "../src/classes/TransactionPool";

describe("Transaction", () => {

	test("Commit", () => {
		const store = new Store();
		const pool = new TransactionPool();
		const transaction = pool.start();

		expect(
			store.get(undefined, "name"),
		).toBe(undefined);

		store.set(transaction, "name", "Mae");

		// Не закоммитили
		expect(
			store.get(undefined, "name"),
		).toBe(undefined);

		transaction.commit();

		// Закоммитили
		expect(
			store.get(undefined, "name"),
		).toBe("Mae");
	});

	test("Rollback", () => {
		const store = new Store();
		const pool = new TransactionPool();
		const transaction = pool.start();

		expect(
			store.get(undefined, "name"),
		).toBe(undefined);

		store.set(transaction, "name", "Mae");

		// Не закоммитили
		expect(
			store.get(undefined, "name"),
		).toBe(undefined);

		transaction.rollback();

		// Откатили
		expect(
			store.get(undefined, "name"),
		).toBe(undefined);
	});

	test("Commit/rollback committed", () => {
		const store = new Store();
		const pool = new TransactionPool();
		const transaction = pool.start();

		expect(
			store.get(undefined, "name"),
		).toBe(undefined);

		store.set(transaction, "name", "Mae");
		transaction.commit();

		expect(
			() => transaction.commit(),
		).toThrow(/Trying to commit/);

		expect(
			() => transaction.rollback(),
		).toThrow(/Trying to rollback/);
	});

	test("Commit/rollback rollbacked", () => {
		const store = new Store();
		const pool = new TransactionPool();
		const transaction = pool.start();

		expect(
			store.get(undefined, "name"),
		).toBe(undefined);

		store.set(transaction, "name", "Mae");
		transaction.rollback();

		expect(
			() => transaction.commit(),
		).toThrow(/Trying to commit/);

		expect(
			() => transaction.rollback(),
		).toThrow(/Trying to rollback/);
	});

	test("Rollback deletes values", () => {
		const store = new Store();
		const pool = new TransactionPool();
		const transaction = pool.start();

		expect(
			store.get(undefined, "name"),
		).toBe(undefined);

		store.set(transaction, "name", "Mae");

		// Не закоммитили
		expect(
			store.get(undefined, "name"),
		).toBe(undefined);

		transaction.rollback();

		// Удалили временное значение
		expect(
			store.get(transaction, "name"),
		).toBe(undefined);
	});

	test("Commit two transactions", () => {
		const store = new Store();
		const pool = new TransactionPool();
		const first = pool.start();
		const second = pool.start();

		store.set(first, "name", "Mae");
		store.set(second, "name", "Bea");

		first.commit();

		expect(
			store.get(undefined, "name"),
		).toBe("Mae");

		second.commit();

		expect(
			store.get(undefined, "name"),
		).toBe("Bea");
	});

	test("Commit two transactions order reversed", () => {
		const store = new Store();
		const pool = new TransactionPool();
		const second = pool.start();
		const first = pool.start();

		store.set(first, "name", "Mae");
		store.set(second, "name", "Bea");

		first.commit();

		expect(
			store.get(undefined, "name"),
		).toBe("Mae");

		second.commit();

		// Вторую транзакцию отклонили
		expect(
			store.get(undefined, "name"),
		).toBe("Mae");
	});

	test("Wrap", () => {
		const pool = new TransactionPool();
		const transaction = pool.start();

		expect(pool.current).not.toBe(transaction);

		transaction.wrap(() => {
			expect(pool.current).toBe(transaction);
		})();

		expect(pool.current).not.toBe(transaction);
		transaction.commit();
	});

	test("Wrap with throw", () => {
		const pool = new TransactionPool();
		const transaction = pool.start();

		expect(pool.current).not.toBe(transaction);

		expect(
			() => transaction.wrap(() => {
				expect(pool.current).toBe(transaction);
				throw new Error("Test");
			})(),
		).toThrow();

		expect(pool.current).not.toBe(transaction);
		transaction.commit();
	});

	test("Transaction change id", () => {
		const pool = new TransactionPool();
		const transaction = pool.start();

		transaction.update(-1);

		expect(transaction.id).toBe(-1);
	});

});
