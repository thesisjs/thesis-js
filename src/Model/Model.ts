import {createAction, createObservable} from "../Observable/Observable";

import {IModel, IModelConstructor} from "./IModel";

export class Model implements IModel {

	public static create<T extends IModel>(
		constructor: IModelConstructor,
		attrs?: object,
	): T {
		const model = new constructor(attrs);
		(model as Model).initAttrs(attrs);

		return model as T;
	}

	public get pk(): string | number {
		return this.getPk();
	}

	public getPk(): string | number {
		return (this as any).id;
	}

	public toPlainObject(): object {
		const plain = {};

		for (const key of (this as any).keys) {
			if (
				this[key] &&
				typeof this[key] === "object" &&
				typeof this[key].toPlainObject === "function"
			) {
				plain[key] = this[key].toPlainObject();
			} else {
				plain[key] = this[key];
			}
		}

		return plain;
	}

	public toJSON(): string {
		return JSON.stringify(this.toPlainObject());
	}

	private initAttrs(attrs: object) {
		for (const key in attrs) {
			if (typeof this[key] !== "function") {
				this[key] = attrs[key];
			}
		}

		// Получаем имена полей
		const keys = Object.keys(this);
		delete (this as any).keys;

		// Превращаем нас в observable
		createObservable(this);

		// Сохраняем имена полей
		(this as any).keys = keys;

		const methodNames = [];
		let prototype = Object.getPrototypeOf(this);
		let descriptors;
		let name;

		// Двигаемся по цепочке прототипов вверх, собираем все методы
		while (
			prototype &&
			prototype !== Object.prototype &&
			prototype !== Function.prototype &&
			prototype !== Model.prototype
		) {
			descriptors = Object.getOwnPropertyDescriptors(prototype);

			for (name in descriptors) {
				if (
					name !== "constructor" &&
					typeof descriptors[name].value === "function"
				) {
					methodNames.push(name);
				}
			}

			prototype = Object.getPrototypeOf(prototype);
		}

		// Превращаем все методы в action
		for (const key of methodNames) {
			(this as any)[key] = createAction(this, (this as any)[key]);
		}
	}
}
