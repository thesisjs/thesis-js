import {IComponentAdministrator} from "../ComponentAdministrator/IComponentAdministrator";
import {ADMINISTRATOR_KEY} from "../utils/componentKeys";
import {IElement} from "../Element/IElement";

export type ComponentLifecycleMethod = () => void;

export interface IComponent {
	readonly [ADMINISTRATOR_KEY]: IComponentAdministrator;
	readonly attrs: object;

	didMount?: ComponentLifecycleMethod;
	didUpdate?: ComponentLifecycleMethod;
	didUnmount?: ComponentLifecycleMethod;

	broadcast(event: string, data?: any);
	set(attrs: object);
	forceUpdate();

	render(): IElement;
}

export type IComponentConstructor = new (attrs: object) => IComponent;
