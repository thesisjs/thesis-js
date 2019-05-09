import * as Simulant from "jsdom-simulant";

import * as Thesis from "../src/index";

describe("Component", () => {

	test("Render once", () => {
		const log = [];

		interface IButtonAttrs {
			title: string;
			disabled: boolean;
			onClick: ((event: MouseEvent) => void);
		}

		class Button extends Thesis.Component<IButtonAttrs> {
			defaults = {
				disabled: false,
				onClick: undefined,
				title: "",
			};

			events = {
				click: this.handleClick.bind(this),
			};

			handleClick(event) {
				this.attrs.onClick(event);
			}

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

			render(): Thesis.Element {
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

			render(): Thesis.Element {
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

});
