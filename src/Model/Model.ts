import {createAction, createAsyncAction, createObservable, createObservableView} from "../Observable/Observable";
import {ACTION_FLAG_KEY, ASYNC_ACTION_FLAG_KEY, VIEW_FLAG_KEY} from "../utils/modelKeys";

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

		// Имена методов
		const methods = [];
		// Имена полей
		const keys = [];

		for (const key in this) {
			// Только собственные имена
			if (!this.hasOwnProperty(key)) {
				continue;
			}

			keys.push(key);
		}

		delete (this as any).keys;

		// Превращаем нас в observable
		createObservable(this, keys);

		// Сохраняем имена полей
		(this as any).keys = keys;

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
					typeof this[name] === "function"
				) {
					methods.push(name);
				}
			}

			prototype = Object.getPrototypeOf(prototype);
		}

		let method;

		// Превращаем декорированные методы в action или view
		for (const key of methods) {
			method = (this as any)[key];

			if (method[ACTION_FLAG_KEY]) {
				(this as any)[key] = createAction(this, method);
			} else if (method[ASYNC_ACTION_FLAG_KEY]) {
				(this as any)[key] = createAsyncAction(this, method);
			} else if (method[VIEW_FLAG_KEY]) {
				createObservableView(this, key, method);
			}
		}
	}
}

/**
 * Декоратор, превращающий метод модели в Action
 */
export function Action(target, propertyKey: string) {
	const impl = target[propertyKey];

	if (typeof impl === "function") {
		impl[ACTION_FLAG_KEY] = true;
	}
}

/**
 * Декоратор, превращающий метод-генератор модели в Action
 */
export function AsyncAction(target, propertyKey: string) {
	let impl = target[propertyKey];

	Object.defineProperty(target, propertyKey, {
		enumerable: true,
		get() {
			return impl;
		},
		set(value) {
			if (typeof value === "function") {
				value[ASYNC_ACTION_FLAG_KEY] = true;
			}

			impl = value;
		},
	});
}

/**
 * Декоратор, превращающий метод модели в View
 */
export function View(target, propertyKey: string) {
	const impl = target[propertyKey];

	if (typeof impl === "function") {
		impl[VIEW_FLAG_KEY] = true;
	}
}
