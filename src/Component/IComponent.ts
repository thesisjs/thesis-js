import {vdom, IVirtualNode} from "../../vendor/cito";

export interface IComponent {
	attrs: object;

	render(): IVirtualNode;

	didMount(): void;
	didUpdate(): void;
	didUnmount(): void;
}

export type IComponentConstructor = new (attrs: object) => IComponent;
