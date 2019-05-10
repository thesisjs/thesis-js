import {IComponentConstructor} from "../Component/IComponent";

import {IComponentKeyStore} from "./IComponentKeyStore";

export class ComponentKeyStore implements IComponentKeyStore {
	private lastKeys: {[name: string]: number} = {};

	public clear(): void {
		this.lastKeys = {};
	}

	public nextKeyFor(constructor: IComponentConstructor): string {
		const name = constructor.name || "$anonymous";

		if (!this.lastKeys[name]) {
			this.lastKeys[name] = 1;
			return `${name}:1`;
		}

		this.lastKeys[name]++;
		return `${name}:${this.lastKeys[name]}`;
	}
}
