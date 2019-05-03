import {IComponent} from "../Component/IComponent";

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
			component.didMount && component.didMount();
		}

		for (component of this.updates) {
			component.didUpdate && component.didUpdate();
		}

		this.mounts = [];
		this.updates = [];
	}
}
