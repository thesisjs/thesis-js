import {IComponent} from "../Component/IComponent";
import {ADMINISTRATOR_KEY} from "../utils/componentKeys";

import {IRenderContext} from "./IRenderContext";

export class RenderContext implements IRenderContext {
	private mounts: IComponent[] = [];
	private updates: IComponent[] = [];

	public scheduleMount(component: IComponent): void {
		this.mounts.push(component);
	}

	public scheduleUpdate(component: IComponent): void {
		this.updates.push(component);
	}

	public fireAll(): void {
		let component;

		for (component of this.mounts) {
			component[ADMINISTRATOR_KEY].callMount();
		}

		for (component of this.updates) {
			component[ADMINISTRATOR_KEY].callUpdate();
		}

		this.mounts = [];
		this.updates = [];
	}
}
