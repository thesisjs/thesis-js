import {Model} from "../Model/Model";
import {IModel, IModelConstructor} from "../Model/IModel";
import {dispose, makeAtom, removeAtom} from "../Observable/Observable";
import {disposeModelLike} from "../utils/disposeModelLike";

export class ModelMap extends Model {

	public static create(item: IModelConstructor, defaults?: any[]): ModelMap;
	public static create<T extends IModel>(
		constructor?: IModelConstructor,
		item?: IModelConstructor,
		defaults?: object,
	): T;
	public static create<T extends IModel>(
		constructorOrItem?: IModelConstructor,
		itemOrDefaults?: IModelConstructor | any[],
		defaults?: object,
	): T & ModelMap {
		let constructor = constructorOrItem;
		let item = itemOrDefaults;

		if ((item && typeof item === "object") || item === undefined) {
			defaults = item as any;
			item = constructorOrItem;
			constructor = ModelMap;
		}

		const modelMap = Model.create<ModelMap>(constructor, {});
		modelMap.itemConstructor = item as any;

		modelMap.keySetImpl = {};
		modelMap.set(defaults);

		return modelMap as any;
	}

	public static keys(map: ModelMap): string[] {
		return Object.keys(map.keySet());
	}

	private keySetImpl: object;
	private itemConstructor: IModelConstructor;

	public get(key: string) {
		return this[`@${key}`];
	}

	public has(key: string): boolean {
		return key in this.keySetImpl;
	}

	/**
	 * Позволяет задать одно значение по ключу
	 * либо заменить все значения новым объектом
	 * @param key
	 * @param value
	 */
	public set(key: string | object, value?: any) {
		let reset = true;

		if (typeof key !== "object") {
			key = {[key]: value};
			reset = false;
		}

		const attrs = key;
		let rawKey;

		// tslint:disable-next-line:forin
		for (key in attrs) {
			rawKey = `@${key}`;

			if (this.has(key)) {
				this[rawKey] = key;
				continue;
			}

			// Сохраняем ключ в набор
			this.keySetImpl[key] = true;

			// Настраиваем поле
			makeAtom(this, rawKey, undefined);

			if (this.itemConstructor !== undefined) {
				this.initControlledModel(rawKey);
			}

			// Записываем значение
			this[rawKey] = attrs[key];
		}

		// Удаляем остальные ключи, если нужно очистить объект
		if (reset) {
			for (key of ModelMap.keys(this)) {
				if (!(key in attrs)) {
					this.remove(key);
				}
			}
		}
	}

	public remove(key: string) {
		if (!this.has(key)) {
			return;
		}

		delete this.keySetImpl[key];

		// Если у нас есть тип элементов, за жизненным циклом
		// элементов отвечаем мы
		if (this.itemConstructor !== undefined) {
			disposeModelMapItem(this, key);
		}

		removeAtom(this, key);
	}

	public keySet(): object {
		return this.keySetImpl;
	}

	public toPlainObject(): object {
		const result = {};
		let item;

		for (const key of ModelMap.keys(this)) {
			item = this.get(key);

			if (
				item &&
				typeof item === "object" &&
				typeof item.toPlainObject === "function"
			) {
				result[key] = item.toPlainObject();
			} else {
				result[key] = item;
			}
		}

		return result;
	}

	protected dispose() {
		for (const key of ModelMap.keys(this)) {
			disposeModelMapItem(this, key);
		}

		super.dispose();
	}

	protected getControlledConstructor(key) {
		return this.itemConstructor;
	}

}

function disposeModelMapItem(map: ModelMap, key: string) {
	const item = map.get(key);
	disposeModelLike(item) || dispose(item);
}
