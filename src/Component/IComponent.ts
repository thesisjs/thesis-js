import {IVirtualNode} from "../../vendor/cito";

export type ComponentLifecycleMethod = () => void;

export interface IComponent {
	readonly attrs: object;

	didMount?: ComponentLifecycleMethod;
	didUpdate?: ComponentLifecycleMethod;
	didUnmount?: ComponentLifecycleMethod;

	broadcast(event: string, data?: any);
	set(attrs: object);
	forceUpdate();

	render(): IVirtualNode;
}

export type IComponentConstructor = new (attrs: object) => IComponent;
