import {IComponent} from "../Component/IComponent";
import {ADMINISTRATOR_KEY} from "../utils/componentKeys";
import {IComponentAdministrator} from "../ComponentAdministrator/IComponentAdministrator";

import {IRenderContext} from "./IRenderContext";

export class RenderContext implements IRenderContext {
	private mounts: IComponent[] = [];
	private updates: IComponent[] = [];
	private administrators: IComponentAdministrator[] = [];

	public registerInAdministrator(admin: IComponentAdministrator): void {
		admin.renderContext = this;
		this.administrators.push(admin);
	}

	public scheduleMount(component: IComponent): void {
		this.mounts.push(component);
	}

	public scheduleUpdate(component: IComponent): void {
		this.updates.push(component);
	}

	public unregisterInAdministrators(): void {
		for (const admin of this.administrators) {
			admin.renderContext = undefined;
		}

		this.administrators = [];
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
