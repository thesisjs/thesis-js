import {Model} from "../src";

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

});
