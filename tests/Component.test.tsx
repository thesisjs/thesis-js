import * as Simulant from "jsdom-simulant";

import * as Thesis from "../src/index";

describe("Component", () => {

	test("Render once", () => {
		interface IButtonAttrs {
			title: string;
			onClick: ((event: MouseEvent) => void);
		}

		class Button extends Thesis.Component<IButtonAttrs> {
			public defaults = {
				onClick: undefined,
				title: "",
			};

			public events = {
				click: this.handleClick.bind(this),
			};

			public handleClick(event) {
				const {onClick} = this.attrs;

				if (onClick) {
					onClick(event);
				}
			}

			public render(): Thesis.Element {
				const {attrs} = this;

				return (
					<button title={attrs.title}>
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
			public defaults = {
				count: 0,
				name: "",
			};

			constructor(attrs) {
				super(attrs);

				this.handleButtonClick = this.handleButtonClick.bind(this);
			}

			public handleButtonClick() {
				this.attrs.count++;
			}

			public render(): Thesis.Element {
				const {attrs} = this;

				return (
					<div>
						Hello, {attrs.name}! You have clicked {attrs.count} times.

						{/*
						  // @ts-ignore */}
						<Button
							title="Keep clicking..."
							onClick={this.handleButtonClick}
						>
							<i>Click me</i>
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
			"<div>Hello, Kaibito! You have clicked 0 times.<button title=\"Keep clicking...\"></button></div>",
		);

		Simulant.fire(root.querySelector("button"), "click");

		expect(root.innerHTML).toBe(
			"<div>Hello, Kaibito! You have clicked 1 times.<button title=\"Keep clicking...\"></button></div>",
		);

		Thesis.unmountComponentAtNode(root);

		expect(root.innerHTML).toBe("");
	});

});
