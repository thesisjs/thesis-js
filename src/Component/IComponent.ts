import {IComponentAdministrator} from "../ComponentAdministrator/IComponentAdministrator";
import {ADMINISTRATOR_KEY} from "../utils/componentKeys";
import {IElement} from "../Element/IElement";
import {IRenderContext} from "../RenderContext/IRenderContext";

export type ComponentLifecycleMethod = () => void;

export interface IComponent {
	readonly [ADMINISTRATOR_KEY]: IComponentAdministrator;

	readonly attrs: object;

	readonly attrChanged: object;
	readonly defaults: object;
	readonly refs: object;

	didMount?: ComponentLifecycleMethod;
	didUpdate?: ComponentLifecycleMethod;
	didUnmount?: ComponentLifecycleMethod;

	broadcast(event: string, data?: any);
	set(attrs: object);

	forceUpdate();
	forceUpdate(renderContext: IRenderContext, options: {render: boolean});

	render(): IElement;
}

export type IComponentConstructor = new (attrs: object) => IComponent;
