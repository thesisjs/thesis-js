import {Model} from "../src";
import {AsyncAction} from "../src/Model/Model";
import {createObserver, dispose} from "../src/Observable/Observable";

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
				this.first++;
				this.second++;

				yield new Promise((resolve) => setTimeout(resolve, 10));

				this.first++;
				this.second++;
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

});
