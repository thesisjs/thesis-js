import {IComponent, IComponentConstructor} from "../Component/IComponent";
import {ADMINISTRATOR_KEY} from "../utils/componentKeys";

import {IComponentKeyStore} from "./IComponentKeyStore";

interface IStoreRecord {
	mentions: number;
	instance: IComponent;
}

export class ComponentKeyStore implements IComponentKeyStore {
	private lastKeys: {[name: string]: number} = {};
	private store: {[key: string]: IStoreRecord} = {};

	public nextKeyFor(constructor: IComponentConstructor): string {
		const name = constructor.name || "$anonymous";

		if (!this.lastKeys[name]) {
			this.lastKeys[name] = 1;
			return `${name}_1`;
		}

		this.lastKeys[name]++;
		return `${name}_${this.lastKeys[name]}`;
	}

	public save(key, instance: IComponent) {
		key = String(key);

		let record = this.store[key];

		if (record && record.instance !== instance) {
			// Удаляем старый компонент
			record.instance[ADMINISTRATOR_KEY].destroyComponent();

			record.instance = instance;
			record.mentions = 0;
		} else if (!record) {
			record = {
				instance,
				mentions: 0,
			};
		}

		record.mentions++;

		this.store[key] = record;
	}

	public collectGarbage(): void {
		let record;

		// tslint:disable-next-line:forin
		for (const key in this.store) {
			record = this.store[key];

			// Удаляем компонент, который не был упомянут в текузей итерации
			if (record.mentions === 0) {
				record.instance[ADMINISTRATOR_KEY].destroyComponent();
				delete this.store[key];
			}
		}
	}

	public clear(): void {
		this.lastKeys = {};

		// Сбрасываем счётчики упоминаний
		// tslint:disable-next-line:forin
		for (const key in this.store) {
			this.store[key].mentions = 0;
		}
	}

	public dispose(): void {
		// tslint:disable-next-line:forin
		for (const key in this.store) {
			this.store[key].instance[ADMINISTRATOR_KEY].destroyComponent();
		}
	}
}
