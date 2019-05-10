import * as Thesis from "../src";
import {ModelMap} from "../src/ModelMap/ModelMap";

describe("ModelMap", () => {

	test("Set", () => {
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

		const persons = Thesis.ModelMap.create<ModelMap>(Thesis.ModelMap, Person, {
			billy: {age: 55, name: "William"},
		});

		expect(persons.toPlainObject()).toEqual({
			billy: {age: 55, name: "William"},
		});
		expect(ModelMap.keys(persons)).toEqual(["billy"]);
		expect(persons.get("billy").format()).toBe("William (55)");

		persons.set("kate", {age: 21, name: "Kaibito"});

		expect(persons.toPlainObject()).toEqual({
			billy: {age: 55, name: "William"},
			kate: {age: 21, name: "Kaibito"},
		});
		expect(ModelMap.keys(persons)).toEqual(["billy", "kate"]);
		expect(persons.get("kate").format()).toBe("Kaibito (21)");

		persons.set({k: {age: 20, name: "Kaibito from the Past"}});

		expect(persons.toPlainObject()).toEqual({
			k: {age: 20, name: "Kaibito from the Past"},
		});
		expect(ModelMap.keys(persons)).toEqual(["k"]);
		expect(persons.get("k").format()).toBe("Kaibito from the Past (20)");

		Thesis.dispose(persons);

		expect(personsCount).toBe(0);
	});

});
