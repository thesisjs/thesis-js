import {IComponent} from "../Component/IComponent";
import {IComponentAdministrator} from "../ComponentAdministrator/IComponentAdministrator";

export interface IRenderContext {
	registerInAdministrator(admin: IComponentAdministrator): void;

	scheduleMount(component: IComponent): void;
	scheduleUpdate(component: IComponent): void;

	unregisterInAdministrators(): void;
	fireAll(): void;
}
