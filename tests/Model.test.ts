// tslint:disable:max-classes-per-file

import {Model, dispose} from "../src";
import {AsyncAction, ControlledModel} from "../src/Model/Model";
import {createObserver} from "../src/Observable/Observable";

describe("Model", () => {

	test("Creation", () => {
		class Person extends Model {
			firstName: string = "";
			lastName: string = "";

			toFormattedString() {
				return `${this.firstName} ${this.lastName}`;
			}
		}

		class Car extends Model {
			brand: string = "";
			model: string = "";
			owner: Person = undefined;

			setBrandAndModel(brand: string, model: string) {
				this.brand = brand;
				this.model = model;
			}
		}

		class LicencedCar extends Car {
			licensePlate: string = "";

			setLicensePlate(licensePlate: string) {
				this.licensePlate = licensePlate;
			}
		}

		const licensedCar = Model.create<LicencedCar>(LicencedCar, {
			brand: "Kia",
			licensePlate: "101",
			model: "Rio",
		});

		expect(licensedCar.toPlainObject()).toEqual({
			brand: "Kia",
			licensePlate: "101",
			model: "Rio",
		});

		licensedCar.setLicensePlate("200");

		expect(licensedCar.toPlainObject()).toEqual({
			brand: "Kia",
			licensePlate: "200",
			model: "Rio",
		});

		licensedCar.setBrandAndModel("KIA", "RIO");

		expect(licensedCar.toPlainObject()).toEqual({
			brand: "KIA",
			licensePlate: "200",
			model: "RIO",
		});

		licensedCar.owner = Model.create<Person>(Person, {
			firstName: "Kaibito",
			lastName: "Young",
		});

		expect(licensedCar.toPlainObject()).toEqual({
			brand: "KIA",
			licensePlate: "200",
			model: "RIO",
			owner: {
				firstName: "Kaibito",
				lastName: "Young",
			},
		});

		expect(licensedCar.owner.toFormattedString()).toBe(
			"Kaibito Young",
		);
	});

	test("AsyncAction", async () => {
		class TwoCounters extends Model {
			first: number = 0;
			second: number = 0;

			@AsyncAction
			increasing = function*() {
				const self = this;

				self.first++;
				self.second++;

				const promiseResult = yield new Promise(
					(resolve) => setTimeout(() => resolve(42), 10),
				);

				expect(promiseResult).toBe(42);

				self.first++;
				self.second++;
			};
		}

		const model = Model.create<TwoCounters>(TwoCounters);
		const log: object[] = [];

		const modelObserver = createObserver(() => {
			log.push(model.toPlainObject());
		});

		modelObserver();

		expect(model.toPlainObject()).toEqual({first: 0, second: 0});

		await model.increasing();

		expect(model.toPlainObject()).toEqual({first: 2, second: 2});

		expect(log).toEqual([
			{first: 0, second: 0},
			{first: 1, second: 1},
			{first: 2, second: 2},
		]);

		dispose(modelObserver);
		dispose(model);
	});

	test("ControlledModel", () => {
		let balances: number;

		interface IBalance {
			mantissa?: number;
			value?: number;

			format?(): string;
		}

		class Balance extends Model implements IBalance {
			mantissa: number = 0;
			value: number = 0;

			didCreate() {
				if (balances === undefined) {
					balances = 0;
				}

				balances++;
			}

			didDispose() {
				balances--;
			}

			format(): string {
				return `${this.value}.${this.mantissa}`;
			}
		}

		class Person extends Model {
			name: string = "";

			@ControlledModel(Balance)
			balance: IBalance = Model.create<Balance>(Balance);
		}

		const person = Model.create<Person>(Person);

		expect(person.toPlainObject()).toEqual({
			balance: {
				mantissa: 0,
				value: 0,
			},
			name: "",
		});
		expect(person.balance.format()).toBe("0.0");

		person.balance = {value: 1, mantissa: 5};

		expect(person.toPlainObject()).toEqual({
			balance: {
				mantissa: 5,
				value: 1,
			},
			name: "",
		});
		expect(person.balance.format()).toBe("1.5");

		person.balance = {mantissa: 1};

		expect(person.toPlainObject()).toEqual({
			balance: {
				mantissa: 1,
				value: 1,
			},
			name: "",
		});
		expect(person.balance.format()).toBe("1.1");

		const otherBalance = Model.create<Balance>(Balance, {
			mantissa: 0,
			value: 10,
		});
		person.balance = otherBalance;

		expect(person.toPlainObject()).toEqual({
			balance: {
				mantissa: 0,
				value: 10,
			},
			name: "",
		});
		expect(person.balance.format()).toBe("10.0");

		person.balance = undefined;

		expect(person.toPlainObject()).toEqual({
			name: "",
		});
		expect(person.balance).toBe(undefined);

		person.balance = {
			mantissa: 0,
			value: 10,
		};

		expect(person.toPlainObject()).toEqual({
			balance: {
				mantissa: 0,
				value: 10,
			},
			name: "",
		});
		expect(person.balance.format()).toBe("10.0");

		// Ожидаем, что модели не утекли
		dispose(person);
		expect(balances).toBe(1);
		dispose(otherBalance);
		expect(balances).toBe(0);
	});

});
