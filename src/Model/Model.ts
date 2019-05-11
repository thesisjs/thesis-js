import {
	createAction,
	createAsyncAction,
	createObservable,
	createObservableView, dispose,
	getRawAtomValue,
} from "../Observable/Observable";
import {
	ACTION_FLAG_KEY,
	ASYNC_ACTION_FLAG_KEY,
	VIEW_FLAG_KEY,
} from "../utils/modelKeys";

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

	private controlledModels: object;
	private viewGetters: Array<((...args: any[]) => any)>;

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

	public clone() {
		return Model.create(this.constructor as IModelConstructor, this.toPlainObject());
	}

	@Action
	public set(attrs: object) {
		// tslint:disable-next-line:forin
		for (const name in attrs) {
			this[name] = attrs[name];
		}
	}

	protected getControlledConstructor(key) {
		return this.controlledModels[key];
	}

	protected dispose() {
		const controlledModels = this.controlledModels || {};

		// tslint:disable-next-line:forin
		for (const key in controlledModels) {
			this[key].dispose();
		}

		for (const key in this) {
			if (typeof this[key] === "function") {
				dispose(this[key] as any);
			}
		}

		dispose(this);

		if ((this as any).didDispose) {
			(this as any).didDispose();
		}
	}

	/**
	 * TODO: В ModelAdministrator
	 * @param key
	 */
	protected initControlledModel(key) {
		const descriptor = Object.getOwnPropertyDescriptor(this, key);

		Object.defineProperty(this, key, {
			...descriptor,
			get: () => {
				return descriptor.get();
			},
			set: (nextValue) => {
				const prevValue = getRawAtomValue(this, key);

				// Собираем мусор или меняем текущую модель
				if (prevValue && prevValue instanceof Model) {
					if (!nextValue) {
						// Удаляем старое значение
						prevValue.dispose();
					} else if (prevValue !== nextValue) {
						if (nextValue instanceof Model) {
							prevValue.set(nextValue.toPlainObject());
						} else if (typeof nextValue === "object") {
							prevValue.set(nextValue);
						}

						// Инстанс не меняем
						return;
					}
				} else if (!(nextValue instanceof Model)) {
					nextValue = Model.create(this.getControlledConstructor(key), nextValue);
				}

				descriptor.set(nextValue);
			},
		});
	}

	/**
	 * Инициализация модели и её реактивных атрибутов
	 * TODO: В ModelAdministrator
	 * @param attrs
	 */
	private initAttrs(attrs: object) {
		for (const key in attrs) {
			if (typeof this[key] !== "function") {
				this[key] = attrs[key];
			}
		}

		// Имена методов
		const methods = [].concat(this.viewGetters || []);
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
		let descriptor;

		// Превращаем декорированные методы в action или view
		for (const key of methods) {
			// На всякий случай возьмём дескриптор, чтобы отловить view
			descriptor = Object.getOwnPropertyDescriptor(this, key);

			if (descriptor && descriptor.get) {
				// Это view
				method = descriptor.get;
			} else {
				// Это action
				method = (this as any)[key];
			}

			if (method[ACTION_FLAG_KEY]) {
				(this as any)[key] = createAction(this, method);
			} else if (method[ASYNC_ACTION_FLAG_KEY]) {
				(this as any)[key] = createAsyncAction(this, method);
			} else if (method[VIEW_FLAG_KEY]) {
				createObservableView(this, key, method);
			}
		}

		// Теперь инициализируем сеттеры для вложенных моделей
		const controlledModels = this.controlledModels || {};

		// tslint:disable-next-line:forin
		for (const key in controlledModels) {
			this.initControlledModel(key);
		}

		// Вызываем метод жизненного цикла
		if ((this as IModel).didCreate) {
			(this as IModel).didCreate();
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
	target.viewGetters = target.viewGetters || [];
	target.viewGetters.push(propertyKey);
}

/**
 * Декоратор, отмечающий управляемую ссылку на другую модель
 */
export function ControlledModel(type: IModelConstructor) {
	return function ControlledModelConstructor(target, propertyKey: string) {
		target.controlledModels = target.controlledModels || {};
		target.controlledModels[propertyKey] = type;
	};
}
