import * as Simulant from "jsdom-simulant";

import * as Thesis from "../src/index";

describe("Component", () => {

	test("Render once", () => {
		interface ITestAttrs {
			name: string;
			count: number;
		}

		class Test extends Thesis.Component<ITestAttrs> {
			protected defaults = {
				count: 0,
			};

			protected events = {
				click: () => {
					this.attrs.count = this.attrs.count || 0;
					this.attrs.count++;
					this.forceUpdate();
				},
			};

			public render(): Thesis.Element {
				return (
					<div>
						Hello, {this.attrs.name}! You have clicked {this.attrs.count} times.
					</div>
				);
			}
		}

		const root = document.createElement("MAIN");

		Thesis.createComponent(Test, root, {
			name: "Kaibito",
		});

		expect(root.innerHTML).toBe(
			"<div>Hello, Kaibito! You have clicked  times.</div>",
		);

		Simulant.fire(root.firstElementChild, "click");

		expect(root.innerHTML).toBe(
			"<div>Hello, Kaibito! You have clicked 1 times.</div>",
		);

		Thesis.unmountComponentAtNode(root);

		expect(root.innerHTML).toBe("");
	});

});
