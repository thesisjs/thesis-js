import {IComponent} from "../Component/IComponent";

export interface IRefs {
	[name: string]: HTMLElement | IComponent;
}
