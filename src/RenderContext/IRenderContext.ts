import {IComponent} from "../Component/IComponent";

export interface IRenderContext {
	scheduleMount(component: IComponent): void;
	scheduleUpdate(component: IComponent): void;

	fireAll(): void;
}
