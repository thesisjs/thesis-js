import {IComponentConstructor} from "../Component/IComponent";

import {IComponentKeyStore} from "./IComponentKeyStore";

export class ComponentKeyStore implements IComponentKeyStore {
	private lastKeys: Map<IComponentConstructor, number> = new Map<IComponentConstructor, number>();

	public clear(): void {
		this.lastKeys.clear();
	}

	public nextKeyFor(constructor: IComponentConstructor): string {
		if (!this.lastKeys.has(constructor)) {
			this.lastKeys.set(constructor, 1);
			return String(1);
		}

		const nextKey = this.lastKeys.get(constructor) + 1;
		this.lastKeys.set(constructor, nextKey);

		return String(nextKey);
	}
}
