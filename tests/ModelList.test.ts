import * as Thesis from "../src";
import {ModelList} from "../src/ModelList/ModelList";

describe("ModelList", () => {

	test("Push", () => {
		let personsCount;

		class Person extends Thesis.Model {
			name: string = "";
			age: number = 0;

			didCreate() {
				if (personsCount === undefined) {
					personsCount = 0;
				}

				personsCount++;
			}

			didDispose() {
				personsCount--;
			}

			format() {
				return `${this.name} (${this.age})`;
			}
		}

		const persons = ModelList.create(Person);

		expect(persons.toPlainObject()).toEqual([]);

		persons.push(
			{age: 10, name: "Azzy"},
			{age: 21, name: "Kaibito"},
		);

		expect(persons.toPlainObject()).toEqual([
			{age: 10, name: "Azzy"},
			{age: 21, name: "Kaibito"},
		]);

		expect(persons[0].format()).toBe("Azzy (10)");

		persons.pop();

		expect(persons.length).toBe(1);

		Thesis.dispose(persons);

		expect(personsCount).toBe(0);
	});

});
