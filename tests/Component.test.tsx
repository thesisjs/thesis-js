// tslint:disable:max-classes-per-file

import * as Simulant from "jsdom-simulant";

import * as Thesis from "../src/index";
import {ADMINISTRATOR_KEY} from "../src/utils/componentKeys";

describe("Component", () => {

	test("Render once", () => {
		const log = [];

		interface IButtonAttrs {
			title: string;
			disabled: boolean;
		}

		class Button extends Thesis.Component<IButtonAttrs> {
			defaults = {
				disabled: false,
				title: "",
			};

			didMount() {
				log.push("Button did mount");

				expect(
					(this.refs.el as HTMLElement).outerHTML,
				).toBe(
					"<button title=\"Keep clicking...\"><i>Click me</i></button>",
				);
			}

			didUpdate() {
				log.push("Button did update");

				expect(
					(this.refs.el as HTMLElement).outerHTML,
				).toBe(
					"<button title=\"Keep clicking...\"><i>Click me</i></button>",
				);
			}

			didUnmount() {
				log.push("Button did unmount");
			}

			render() {
				const {attrs} = this;

				return (
					<button
						title={attrs.title}
						ref="el"
					>
						{attrs.children}
					</button>
				);
			}
		}

		interface ITestAttrs {
			name: string;
			count: number;
		}

		class Test extends Thesis.Component<ITestAttrs> {
			defaults = {
				count: 0,
				name: "",
			};

			constructor(attrs) {
				super(attrs);

				this.handleButtonClick = this.handleButtonClick.bind(this);
			}

			handleButtonClick() {
				this.attrs.count++;
			}

			didMount() {
				log.push("Test did mount");

				expect(
					(this.refs.text as HTMLElement).outerHTML,
				).toBe(
					"<i>Click me</i>",
				);

				expect(this.refs.button instanceof Button).toBeTruthy();
			}

			didUpdate() {
				log.push("Test did update");

				expect(
					(this.refs.text as HTMLElement).outerHTML,
				).toBe(
					"<i>Click me</i>",
				);

				expect(this.refs.button instanceof Button).toBeTruthy();
			}

			didUnmount() {
				log.push("Test did unmount");
			}

			render() {
				const {attrs} = this;

				return (
					<div
						className="test test_default"
						style={{pointerEvents: "none"}}
					>
						Hello, {attrs.name}! You have clicked {attrs.count} times.

						{/*
						  // @ts-ignore */}
						<Button
							title="Keep clicking..."
							onClick={this.handleButtonClick}
							ref="button"
						>
							<i ref="text">Click me</i>
						</Button>

						<span dangerouslySetInnerHTML={{__html: "<i>Thank you!</i>"}}/>
					</div>
				);
			}
		}

		const root = document.createElement("MAIN");

		Thesis.createComponent(Test, root, {
			name: "Kaibito",
		});

		expect(root.innerHTML).toBe(
			`<div style="pointer-events: none;" class="test test_default">
				Hello, Kaibito! You have clicked 0 times.
				<button title="Keep clicking...">
					<i>Click me</i>
				</button>
				<span><i>Thank you!</i></span>
			</div>`.replace(/[\t\r\n]/g, ""),
		);

		Simulant.fire(root.querySelector("button"), "click");

		expect(root.innerHTML).toBe(
			`<div style="pointer-events: none;" class="test test_default">
				Hello, Kaibito! You have clicked 1 times.
				<button title="Keep clicking...">
					<i>Click me</i>
				</button>
				<span><i>Thank you!</i></span>
			</div>`.replace(/[\t\r\n]/g, ""),
		);

		Thesis.unmountComponentAtNode(root);

		expect(root.innerHTML).toBe("");

		expect(log).toEqual([
			"Button did mount",
			"Test did mount",
			"Button did update",
			"Test did update",
			"Test did unmount",
			"Button did unmount",
		]);
	});

	test("Model + Component", () => {
		const log: string[] = [];

		class Person extends Thesis.Model {
			firstName: string = "";
			lastName: string = "";

			@Thesis.View
			get fullName(): string {
				return `${this.firstName} ${this.lastName}`;
			}

			@Thesis.Action
			setFullName(firstName: string, lastName: string) {
				this.firstName = firstName;
				this.lastName = lastName;
			}
		}

		interface IPersonViewAttrs {
			person: Person;
		}

		class PersonView extends Thesis.Component<IPersonViewAttrs> {
			defaults = {
				person: Thesis.createModel<Person>(Person),
			};

			didMount() {
				log.push("mount");
			}

			didUpdate() {
				log.push("update");
			}

			didUnmount() {
				log.push("unmount");
			}

			render() {
				const {attrs} = this;

				return (
					<div>{attrs.person.fullName}</div>
				);
			}
		}

		const root = document.createElement("MAIN");

		const personView = Thesis.createComponent(PersonView, root, {});

		expect(root.innerHTML).toBe(
			"<div> </div>",
		);

		(personView.attrs as IPersonViewAttrs).person.setFullName("Kaibito", "Young");

		expect(root.innerHTML).toBe(
			"<div>Kaibito Young</div>",
		);

		Thesis.unmountComponentAtNode(root);

		expect(root.innerHTML).toBe("");

		expect(log).toEqual([
			"mount",
			"update",
			"unmount",
		]);
	});

	xtest("Model with observable view + Component", () => {
		const log: string[] = [];

		class Person extends Thesis.Model {
			firstName: string = "";
			lastName: string = "";

			get lastNameCapitalized(): string {
				return this.lastName.toUpperCase();
			}

			@Thesis.View
			getFullName(separator: string) {
				return `${this.lastNameCapitalized}${separator}${this.firstName}`;
			}

			@Thesis.Action
			setFullName(firstName: string, lastName: string) {
				this.firstName = firstName;
				this.lastName = lastName;
			}
		}

		interface IPersonViewAttrs {
			person: Person;
		}

		class PersonView extends Thesis.Component<IPersonViewAttrs> {
			defaults = {
				person: undefined,
			};

			didMount() {
				log.push("mount");
			}

			didUpdate() {
				log.push("update");
			}

			didUnmount() {
				log.push("unmount");
			}

			render() {
				const {attrs} = this;

				return (
					<div>{attrs.person.getFullName(" ")}</div>
				);
			}
		}

		const root = document.createElement("MAIN");

		const person = Thesis.createModel<Person>(Person);
		const personView = Thesis.createComponent(PersonView, root, {person});

		expect(root.innerHTML).toBe(
			"<div> </div>",
		);

		(personView.attrs as IPersonViewAttrs).person.setFullName("Kaibito", "Young");

		expect(root.innerHTML).toBe(
			"<div>YOUNG Kaibito</div>",
		);

		Thesis.unmountComponentAtNode(root);
		Thesis.dispose(person);

		expect(root.innerHTML).toBe("");

		expect(log).toEqual([
			"mount",
			"update",
			"unmount",
		]);
	});

	test("attrChanged", () => {
		const log: string[] = [];

		interface IPersonAttrs {
			name: string;
			age: number;
			log: string[];
		}

		class Test extends Thesis.Component<IPersonAttrs> {
			defaults = {
				age: NaN,
				log,
				name: "Nobody",
			};

			attrChanged = {
				age(next, prev) {
					this.attrs.log.push(`attrChanged age from ${prev} to ${next}`);
				},
				name(next, prev) {
					this.attrs.log.push(`attrChanged name from ${prev} to ${next}`);
				},
			};

			render() {
				const {attrs} = this;

				return (
					<div>{attrs.name} ({attrs.age})</div>
				);
			}
		}

		const root = document.createElement("MAIN");
		const view = Thesis.createComponent(Test, root, {});

		(view.attrs as IPersonAttrs).name = "Kaibito";
		(view.attrs as IPersonAttrs).age = 21;
		(view.attrs as IPersonAttrs).age = 21;

		expect(log).toEqual([
			"attrChanged name from Nobody to Kaibito",
			"attrChanged age from NaN to 21",
		]);

		expect(root.innerHTML).toBe(
			"<div>Kaibito (21)</div>",
		);

		Thesis.unmountComponentAtNode(root);
	});

	test("Input change event", () => {
		const log: string[] = [];

		class Input extends Thesis.Component<{}> {
			constructor(attrs) {
				super(attrs);
				this.handleChange = this.handleChange.bind(this);
			}

			handleChange(evt) {
				expect(evt.target).toBe(this.refs.input);
				expect(evt.target.outerHTML).toBe("<input>");

				log.push("Input change");

				this.broadcast("custom", "Some data");
			}

			render() {
				return (
					<input
						ref="input"
						onChange={this.handleChange}
						onClick={this.remit("inputClick")}
					/>
				);
			}
		}

		class Test extends Thesis.Component<{}> {
			constructor(attrs) {
				super(attrs);
				this.handleCustom = this.handleCustom.bind(this);
				this.handleInputClick = this.handleInputClick.bind(this);
				this.handleMouseMove = this.handleMouseMove.bind(this);
			}

			handleCustom(evt) {
				const inputEl = Thesis.findDOMNode(this.refs.input as Thesis.Component<any>);

				expect(evt.target).toBe(inputEl);
				expect(evt.target.outerHTML).toBe("<input>");
				expect(evt.detail).toBe("Some data");

				log.push("Test custom");
			}

			handleInputClick(evt) {
				const inputEl = Thesis.findDOMNode(this.refs.input as Thesis.Component<any>);

				expect(evt.target).toBe(inputEl);
				expect(evt.target.outerHTML).toBe("<input>");
				expect(evt.detail.originalEvent.type).toBe("click");

				log.push("Test input click");
			}

			handleMouseMove(evt) {
				const inputEl = Thesis.findDOMNode(this.refs.input as Thesis.Component<any>);

				expect(evt.target).toBe(inputEl);
				expect(evt.target.outerHTML).toBe("<input>");

				log.push("Test mouse move");
			}

			render() {
				return (
					<div
						ref="el"
						onChange={() => log.push("Test change")}
						onClick={() => log.push("Test click")}
						onMouseMove={this.handleMouseMove}
					>
						<Input
							ref="input"
							onCustom={this.handleCustom}
							onInputClick={this.handleInputClick}
						/>
					</div>
				);
			}
		}

		const root = document.createElement("MAIN");
		Thesis.createComponent(Test, root, {});

		Simulant.fire(root.querySelector("input"), "change");
		Simulant.fire(root.querySelector("input"), "click");
		Simulant.fire(root.querySelector("input"), "mousemove");

		expect(log).toEqual([
			"Input change",
			// Перехваченные события не всплывают, вместо них -- изменённые
			"Test custom",
			"Test input click",
			// А обычное событие всплывает
			"Test mouse move",
		]);

		Thesis.unmountComponentAtNode(root);
	});

	test("JSX Conditions", () => {
		interface ITestAttrs {
			visible: boolean;
		}

		class Test extends Thesis.Component<ITestAttrs> {
			defaults = {
				visible: false,
			};

			render() {
				return (
					<div>
						{this.attrs.visible && (
							<span>Hello!</span>
						)}
					</div>
				);
			}
		}

		const root = document.createElement("MAIN");
		Thesis.createComponent(Test, root, {});

		expect(root.innerHTML).toBe("<div></div>");

		Thesis.unmountComponentAtNode(root);
	});

	test("Deep nesting", () => {
		interface ITestAttrs {
			nested: number;
		}

		class Test extends Thesis.Component<ITestAttrs> {
			defaults = {
				nested: 0,
			};

			render() {
				const nested = this.attrs.nested - 1;

				return (
					<div>
						{this[ADMINISTRATOR_KEY].key}
						{!!nested && (
							<Test nested={nested}/>
						)}
					</div>
				);
			}
		}

		const root = document.createElement("MAIN");
		const test = Thesis.createComponent(Test, root, {nested: 5});

		expect(root.innerHTML).toMatch(
			new RegExp(`^<div>\\d
				<div>\\d:Test_1
					<div>\\d:Test_1:Test_1
						<div>\\d:Test_1:Test_1:Test_1
							<div>\\d:Test_1:Test_1:Test_1:Test_1
							<\/div>
						<\/div>
					<\/div>
				<\/div>
			<\/div>$`.replace(/[\n\r\t]/g, "")),
		);

		test.set({nested: 2});

		expect(root.innerHTML).toMatch(
			/<div>\d<div>\d:Test_1<\/div><\/div>/,
		);

		test.set({nested: 3});

		expect(root.innerHTML).toMatch(
			/<div>\d<div>\d:Test_1<div>\d:Test_1:Test_1<\/div><\/div><\/div>/,
		);

		Thesis.unmountComponentAtNode(root);
	});

	test("Component with no attrs", () => {
		class Child extends Thesis.Component<{}> {
			render() {
				return (
					<div>i am empty and useless child</div>
				);
			}
		}

		class Parent extends Thesis.Component<{}> {
			render() {
				return (
					<div>
						<Child/>
					</div>
				);
			}
		}

		const root = document.createElement("MAIN");
		Thesis.createComponent(Parent, root, undefined);

		expect(root.innerHTML).toBe(
			"<div><div>i am empty and useless child</div></div>",
		);

		Thesis.unmountComponentAtNode(root);
	});

});
