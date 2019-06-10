import {Action, Model} from "../Model/Model";
import {IModel, IModelConstructor} from "../Model/IModel";
import {dispose, getRawAtomValue, makeAtom, removeAtom} from "../Observable/Observable";
import {disposeModelLike} from "../utils/disposeModelLike";

export class ModelList extends Model implements ArrayLike<any> {

	public static create(item: IModelConstructor, defaults?: any[]): ModelList;
	public static create<T extends IModel>(
		constructor?: IModelConstructor,
		item?: IModelConstructor,
		defaults?: any[],
	): T;
	public static create<T extends IModel>(
		constructorOrItem?: IModelConstructor,
		itemOrDefaults?: IModelConstructor | any[],
		defaults?: any[],
	): T & ModelList {
		let constructor = constructorOrItem;
		let item = itemOrDefaults;

		if (Array.isArray(item) || item === undefined) {
			defaults = item as any;
			item = constructorOrItem;
			constructor = ModelList;
		}

		const modelList = Model.create<ModelList>(constructor, {});
		modelList.itemConstructor = item;

		modelList.initLength();
		modelList.set(defaults);

		return modelList as any;
	}

	public length: number = 0;

	private itemConstructor: IModelConstructor;

	public set(attrs?: any[]) {
		if (!attrs) {
			return;
		}

		this.length = attrs.length;

		for (let i = 0; i < attrs.length; i++) {
			this[i] = attrs[i];
		}
	}

	public toPlainObject(): object {
		const {length} = this;
		const result = [];
		let item;

		result.length = length;

		for (let i = 0; i < length; i++) {
			item = this[i];

			if (
				item &&
				typeof item === "object" &&
				typeof item.toPlainObject === "function"
			) {
				result[i] = item.toPlainObject();
			} else {
				result[i] = item;
			}
		}

		return result;
	}

	// ==== Методы изменения массива ====

	@Action
	public pop() {
		const {length} = this;

		if (length === 0) {
			return;
		}

		const result = this[length - 1];
		this.length--;

		return result;
	}

	public push(...args: any[]);
	@Action
	public push() {
		const {length} = this;
		this.length += arguments.length;

		for (let i = 0; i < arguments.length; i++) {
			this[length + i] = arguments[i];
		}

		return this.length;
	}

	@Action
	public reverse() {
		const {length} = this;
		let item;

		for (let i = 0; i < length % 2; i++) {
			item = this[i];
			this[i] = this[length - i];
			this[length - 1] = item;
		}

		return this;
	}

	@Action
	public shift() {
		const {length} = this;

		if (length === 0) {
			return;
		}

		const first = this[0];

		for (let i = 0; i < length - 1; i++) {
			this[i] = this[i + 1];
		}

		this.length--;
		return first;
	}

	@Action
	public sort(comparator?) {
		this.set(this.slice().sort(comparator));
	}

	@Action
	public splice(start?, deleteCount?, ...insertItems: any[]) {
		const array = this.slice();

		Array.prototype.splice.apply(
			array,
			[start, deleteCount].concat(insertItems),
		);

		this.set(array);
	}

	public unshift(...args: any[]);
	@Action
	public unshift() {
		const {length} = this;
		this.length += arguments.length;

		for (let i = 0; i < length; i++) {
			this[length + arguments.length + i] = this[length + i];
		}

		for (let i = 0; i < arguments.length; i++) {
			this[i] = arguments[i];
		}

		return this.length;
	}

	// ==== Методы доступа к элементам массива ====

	public concat(...args: any[]);
	public concat() {
		return Array.prototype.concat.apply(this.slice(), arguments);
	}

	public listConcat(...args: any[]);
	public listConcat() {
		return ModelList.create(
			this.constructor as any,
			this.itemConstructor,
			this.concat.apply(this, arguments),
		);
	}

	public includes(item) {
		return this.indexOf(item) !== -1;
	}

	public join(separator = ",") {
		return this.slice().join(separator);
	}

	public slice(begin?, end?) {
		const {length} = this;

		if (begin === undefined) {
			begin = 0;
		}

		if (end === undefined) {
			end = length;
		}

		if (begin < 0) {
			begin += length;

			if (begin < 0) {
				begin = 0;
			}
		} else if (begin > length) {
			begin = length;
		}

		if (end < 0) {
			end += length;

			if (end < 0) {
				end = 0;
			}
		} else if (end > length) {
			end = length;
		}

		const result = [];
		let index;

		result.length = end - begin;

		for (let i = 0; i < result.length; i++) {
			index = begin + i;
			result[i] = this[index];
		}

		return result;
	}

	public listSlice(begin?, end?) {
		const array = this.slice.apply(this, arguments);

		return ModelList.create(
			this.constructor as any,
			this.itemConstructor,
			array,
		);
	}

	public indexOf(item) {
		const {length} = this;

		for (let i = 0; i < length; i++) {
			if (this[i] === item) {
				return i;
			}
		}

		return -1;
	}

	public lastIndexOf(item) {
		const {length} = this;

		for (let i = length - 1; i >= 0; i--) {
			if (this[i] === item) {
				return i;
			}
		}

		return -1;
	}

	public toArray() {
		return this.slice();
	}

	// ==== Методы обхода ====

	public forEach(callback, thisArg = null) {
		for (let i = 0; i < this.length; i++) {
			callback.apply(thisArg, [this[i], i, this]);
		}
	}

	public every(callback, thisArg = null) {
		let result = true;

		for (let i = 0; i < this.length; i++) {
			result = result && callback.apply(thisArg, [this[i], i, this]);

			if (!result) {
				break;
			}
		}

		return result;
	}

	public some(callback, thisArg = null) {
		let result = false;

		for (let i = 0; i < this.length; i++) {
			result = result || callback.apply(thisArg, [this[i], i, this]);

			if (result) {
				break;
			}
		}

		return result;
	}

	public filter(callback, thisArg = null) {
		const result = [];

		for (let i = 0; i < this.length; i++) {
			if (callback.apply(thisArg, [this[i], i, this])) {
				result.push(this[i]);
			}
		}

		return result;
	}

	public listFilter(callback, thisArg = null) {
		return ModelList.create(
			this.constructor as any,
			this.itemConstructor,
			this.filter(callback, thisArg),
		);
	}

	public find(callback, thisArg = null) {
		const index = this.findIndex(callback, thisArg);

		if (index === -1) {
			return;
		}

		return this[index];
	}

	public findIndex(callback, thisArg = null) {
		for (let i = 0; i < this.length; i++) {
			if (callback.apply(thisArg, [this[i], i, this])) {
				return i;
			}
		}

		return -1;
	}

	public map(callback, thisArg = null) {
		const result = [];
		result.length = this.length;

		for (let i = 0; i < this.length; i++) {
			result.push(
				callback.apply(thisArg, [this[i], i, this]),
			);
		}

		return result;
	}

	public listMap(callback, thisArg = null) {
		return ModelList.create(
			this.constructor as any,
			this.itemConstructor,
			this.map(callback, thisArg),
		);
	}

	public reduce(callback, initialValue?) {
		let accumulator;
		let start;

		if (initialValue !== undefined) {
			accumulator = initialValue;
			start = 0;
		} else {
			accumulator = this[0];
			start = 1;
		}

		for (let i = start; i < this.length; i++) {
			accumulator = callback.apply(
				null,
				[accumulator, this[i], i, this],
			);
		}

		return accumulator;
	}

	public reduceRight(callback, initialValue?) {
		let accumulator;
		let start;

		if (initialValue !== undefined) {
			accumulator = initialValue;
			start = this.length - 1;
		} else {
			accumulator = this.length - 1;
			start = this.length - 2;
		}

		for (let i = start; i >= 0; i--) {
			accumulator = callback.apply(
				null,
				[accumulator, this[i], i, this],
			);
		}

		return accumulator;
	}

	// ==== Служебные методы ====

	protected getControlledConstructor(key) {
		return this.itemConstructor;
	}

	protected dispose() {
		const {length} = this;

		for (let i = 0; i < length; i++) {
			disposeModelListItem(this, i);
		}

		super.dispose();
	}

	private initLength() {
		// Переопределяем длину
		const descriptor = Object.getOwnPropertyDescriptor(this, "length");

		Object.defineProperty(this, "length", {
			...descriptor,
			set: (nextLength) => {
				const prevLength = getRawAtomValue(this, "length");

				if (
					nextLength < 0 ||
					typeof nextLength !== "number" ||
					!isFinite(nextLength)
				) {
					nextLength = 0;
				}

				if (nextLength > prevLength) {
					// Расширяем количество реактивных элементов
					for (let i = prevLength; i < nextLength; i++) {
						makeAtom(this, i, undefined);

						// Если у нас есть тип элементов, будем считать, что
						// все элементы -- controlled model
						if (this.itemConstructor !== undefined) {
							this.initControlledModel(i);
						}
					}
				} else if (nextLength < prevLength) {
					// Удаляем лишние элементы
					for (let i = nextLength; i < prevLength; i++) {
						// Если у нас есть тип элементов, за жизненным циклом
						// элементов отвечаем мы
						if (this.itemConstructor !== undefined) {
							disposeModelListItem(this, i);
						}

						removeAtom(this, i);
					}
				}

				// Реактивно присваиваем новую длину
				descriptor.set(nextLength);
			},
		});
	}

}

function disposeModelListItem(models: ModelList, index: number) {
	const item = models[index];
	disposeModelLike(item) || dispose(item);
}
