import * as Simulant from "jsdom-simulant";

import * as Thesis from "../src/index";

describe("Component", () => {

	test("Render once", () => {
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
	});

});
