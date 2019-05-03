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
					<div>
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
					</div>
				);
			}
		}

		const root = document.createElement("MAIN");

		Thesis.createComponent(Test, root, {
			name: "Kaibito",
		});

		expect(root.innerHTML).toBe(
			`<div>
				Hello, Kaibito! You have clicked 0 times.
				<button title="Keep clicking...">
					<i>Click me</i>
				</button>
			</div>`.replace(/[\t\r\n]/g, ""),
		);

		Simulant.fire(root.querySelector("button"), "click");

		expect(root.innerHTML).toBe(
			`<div>
				Hello, Kaibito! You have clicked 1 times.
				<button title="Keep clicking...">
					<i>Click me</i>
				</button>
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

});
