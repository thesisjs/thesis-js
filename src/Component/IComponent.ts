import {IVirtualNode} from "../../vendor/cito";

export type ComponentLifecycleMethod = () => void;

export interface IComponent {
	attrs: object;

	didMount?: ComponentLifecycleMethod;
	didUpdate?: ComponentLifecycleMethod;
	didUnmount?: ComponentLifecycleMethod;

	set(attrs: object);
	forceUpdate();

	render(): IVirtualNode;
}

export type IComponentConstructor = new (attrs: object) => IComponent;
