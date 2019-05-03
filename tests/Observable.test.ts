import {
	observable,
	observer,
	attachView,
	dispose,
	getAllObservers, makeAction,
} from "../src/Observable/Observable";

describe("observable", () => {

	test("attrs", () => {
		const car = observable({
			acceleration: 20,
			time: 0,
		});

		expect(car.time).toBe(0);
		expect(car.acceleration).toBe(20);

		car.time = 1;
		expect(car.time).toBe(1);

		car.time = 1;
		expect(car.time).toBe(1);

		dispose(car);
	});

	test("reactive", () => {
		const car = observable({
			acceleration: 20,
			time: 0,
		});

		const speeds = [];

		const carObserver = observer(() => {
			speeds.push(car.time * car.acceleration);
		});

		carObserver();

		car.time = 1;
		car.acceleration = 30;
		expect(speeds).toEqual([0, 20, 30]);

		dispose(car);
		dispose(carObserver);
	});

	test("action", () => {
		const car = observable({
			acceleration: 20,
			time: 0,
		});

		makeAction(car, "setTime", function(value) {
			this.time = value;
		});

		const speeds = [];

		const carObserver = observer(() => {
			speeds.push(car.time * car.acceleration);
		});

		carObserver();
		carObserver();

		expect(speeds).toEqual([0, 0]);

		car.setTime(1);
		expect(speeds).toEqual([0, 0, 20]);

		dispose(car);
		dispose(carObserver);
	});

	test("action in action", () => {
		const car = observable({
			acceleration: 20,
			time: 0,

			setTime(value) {
				this.time = value;
			},

			setSpeed(time, acceleration) {
				this.acceleration = acceleration;
				this.setTime(time);
			},
		});

		const speeds = [];

		const carObserver = observer(() => {
			speeds.push(car.time * car.acceleration);
		});

		carObserver();
		expect(speeds).toEqual([0]);

		car.setTime(1);
		expect(speeds).toEqual([0, 20]);

		car.setSpeed(2, 30);
		expect(speeds).toEqual([0, 20, 60]);

		dispose(car);
		dispose(carObserver);
	});

	test("computed value", () => {
		let computed = 0;

		const car = observable({
			acceleration: 20,
			time: 0,

			get speed() {
				computed++;
				return this.time * this.acceleration;
			},
		});

		const speeds = [];

		const carObserver = observer(() => {
			speeds.push(car.speed);
		});

		carObserver();
		carObserver();

		car.time = 1;
		carObserver();
		car.time = 2;

		expect(speeds).toEqual([0, 0, 20, 20, 40]);
		expect(computed).toBe(3);

		dispose(car);
		dispose(carObserver);
	});

	test("computed view", () => {
		let computed = 0;

		const car = observable({
			acceleration: 20,
		});

		attachView(car, "getSpeed", function(time) {
			computed++;
			return time * this.acceleration;
		});

		const speeds = [];

		const carObserver = observer(() => {
			speeds.push(car.getSpeed(1));
		});

		carObserver();
		carObserver();

		car.acceleration = 10;
		carObserver();
		carObserver();

		expect(speeds).toEqual([20, 20, 10, 10]);
		expect(computed).toBe(4);

		dispose(car);
		dispose(carObserver);
	});

	test("modifying a view", () => {
		const car = observable({
			acceleration: 20,
			time: 0,

			get speed() {
				return this.time * this.acceleration;
			},
		});

		expect(() => {
			car.speed = 15;
		}).toThrow();

		dispose(car);
	});

	test("dispose an observer", () => {
		const car = observable({
			acceleration: 20,
			time: 0,

			get speed() {
				return this.time * this.acceleration;
			},
		});

		const speeds = [];

		const carObserver = observer(() => {
			speeds.push(car.speed);
		});

		carObserver();
		expect(speeds).toEqual([0]);

		dispose(carObserver);

		expect(() => {
			carObserver();
		}).toThrow();

		dispose(car);
	});

	test("dispose an observable", () => {
		const car = observable({
			acceleration: 20,
			time: 0,

			get speed() {
				return this.time * this.acceleration;
			},
		});

		const speeds = [];

		const carObserver = observer(() => {
			speeds.push(car.speed);
		});

		carObserver();
		expect(speeds).toEqual([0]);

		dispose(car);
		dispose(carObserver);

		expect(() => {
			car.time = 2;
		}).toThrow();

		expect(() => {
			// tslint:disable-next-line:no-console
			console.log(car.acceleration);
		}).toThrow();

		expect(() => {
			// tslint:disable-next-line:no-console
			console.log(car.speed);
		}).toThrow();

		expect(() => {
			observable(car);
		}).toThrow();

		expect(
			Object.values(getAllObservers()).filter(Boolean).length,
		).toBe(0);
	});

	test("dispose any other value", () => {
		expect(() => {
			dispose(null);
		}).not.toThrow();

		expect(() => {
			dispose(void 0);
		}).not.toThrow();

		expect(() => {
			dispose({});
		}).not.toThrow();

		expect(() => {
			dispose(3 as any);
		}).not.toThrow();
	});

	test("observable typecheck", () => {
		expect(() => {
			observable(null);
		}).toThrow();

		expect(() => {
			observable(void 0);
		}).toThrow();

		expect(() => {
			observable(3);
		}).toThrow();

		const car = observable({});

		expect(() => {
			observable(car);
		}).toThrow();

		dispose(car);
	});

	test("observer typecheck", () => {
		expect(() => {
			observer(null);
		}).toThrow();

		expect(() => {
			observer(void 0);
		}).toThrow();

		expect(() => {
			observer({});
		}).toThrow();
	});

	test("disposing an observer on the fly", () => {
		let speed = 0;
		let willDispose = false;

		const car = observable({
			acceleration: 20,
			time: 1,
		});

		const firstObserver = observer(() => {
			speed = car.time * car.acceleration;

			if (willDispose) {
				dispose(secondObserver);
			}
		});

		const secondObserver = observer(() => {
			speed = 2 * car.time * car.acceleration;
		});

		firstObserver();
		secondObserver();
		expect(speed).toBe(40);

		willDispose = true;
		car.time = 3;

		expect(speed).toBe(60);

		dispose(firstObserver);
		dispose(car);
	});

});
