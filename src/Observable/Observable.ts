import {
	ATTRS_KEY as attrsKey,
	ADMINISTRATOR_KEY as administratorKey,
	VIEWS_KEY as viewsKey,
	OBSERVER_ID_KEY as observerId,
	REACTION_KEY as reactionKey,
	DISPOSED_KEY as disposedKey,
} from "../utils/observableKeys";
import {assert} from "../utils/assert";
import {makeObservableAdministrator} from "../ObservableAdministrator/ObservableAdministrator";

const observers = {};
const observableStack = [];
let lastObservableId = 1;
let actionCount = 0;
let viewComputationStack = 0;

interface IViewData {
	cached: any;
	observer: ((...args: any) => any);
	valid: boolean;
	getter?: (() => any);
}

function makeView(object, name, view, asMethod) {
	// Описание view
	const viewData: IViewData = object[viewsKey][name] = {
		cached: null,
		observer: null,
		valid: false,
	};

	// Реакция, которая сбрасывает кеш
	const clearReaction = function $clearReaction() {
		viewData.cached = null;
		viewData.valid = false;

		// Распространяем реакцию
		viewComputationStack++;
		object[administratorKey].reactHook(name, viewData.cached, viewComputationStack, actionCount);
		viewComputationStack--;
	};

	// Реакция, которая пересчитает заново значение и кладёт в кеш
	const computeReaction = function $computeReaction() {
		viewData.cached = view.apply(object, arguments);
		// Валидными в кеше считаем только вычисляемые свойства без аргументов
		viewData.valid = arguments.length === 0;
	};

	const viewObserver = viewData.observer = observer(clearReaction);

	// Геттер для view
	viewData.getter = function $view() {
		// Если кеш невалиден, вызовем временный observer, который пересчитает заново значение и положит в кеш
		if (!viewData.valid) {
			setObserverReaction(viewObserver, computeReaction);
			viewObserver.apply(this, arguments);
			setObserverReaction(viewObserver, clearReaction);
		}

		// Возвратим значение из кеша
		return viewData.cached;
	};

	if (asMethod) {
		// Делаем метод
		Object.defineProperty(object, name, {
			enumerable: false,
			value: viewData.getter,
			writable: false,
		});
	} else {
		// Делаем атом-заглушку
		makeAtom(object, name, null);
	}
}

function makeAtom(object, name, defaultValue) {
	// Значение по умолчанию
	object[attrsKey][name] = defaultValue;

	Object.defineProperty(object, name, {
		get() {
			assert(
				!object[disposedKey],
				"Cannot read from a disposed object!",
			);

			const administrator = object[administratorKey];
			return administrator.trackHook(name);
		},

		set(value) {
			assert(
				!object[disposedKey],
				"Cannot mutate a disposed object!",
			);

			const attrs = object[attrsKey];
			const views = object[viewsKey];
			const administrator = object[administratorKey];

			// Нельзя изменять computed-свойство
			assert(
				!views[name],
				`Cannot mutate view '${name}'!`,
			);

			// Если значение не поменялось
			if (attrs[name] === value) {
				return;
			}

			administrator.reactHook(name, value, viewComputationStack, actionCount);
		},
	});
}

export function makeAction(object, name, action) {
	Object.defineProperty(object, name, {
		enumerable: false,
		writable: false,

		value: function $action() {
			actionCount++;
			action.apply(object, arguments);
			actionCount--;

			// После последнего экшна запускаем реакции
			if (!actionCount) {
				object[administratorKey].callReactionsHook();
			}
		},
	});
}

/**
 * Превращает переданный объект в Observable
 * @param object
 */
export function observable(object) {
	assert(
		object && typeof object === "object",
		`Expected an object, bun got '${typeof object}'`,
	);

	assert(
		!object[disposedKey],
		`Cannot create observable over a disposed object!`,
	);

	assert(
		!object[administratorKey],
		`Cannot create observable on top of another observable!`,
	);

	object[attrsKey] = {};
	object[viewsKey] = {};
	object[administratorKey] = makeObservableAdministrator(object, observableStack, observers);

	const keys = Object.keys(object);
	let descriptor;

	// Проходимся по всем ключам объекта
	for (const key of keys) {
		descriptor = Object.getOwnPropertyDescriptor(object, key);

		if (descriptor.get) {
			// View без аргументов (computed property)
			makeView(object, key, descriptor.get, false);
		} else {
			// Атом (обычный атрибут)
			makeAtom(object, key, descriptor.value);
		}
	}

	return object;
}

/**
 * Превращает переданную функцию в observer
 * @param reaction
 */
export function observer(reaction) {
	assert(
		typeof reaction === "function",
		`Expected function, but got '${typeof reaction}'`,
	);

	const id = lastObservableId++;

	const observe = function $observe() {
		observableStack.push(id);
		const result = observe[reactionKey].apply(this, arguments);
		observableStack.pop();

		return result;
	};

	// Сохраним observer в глобальной карте
	observers[id] = observe;
	// Сохраняем id observer-а
	observe[observerId] = id;
	observe[reactionKey] = reaction;

	return observe;
}

function disposeObserver(observe) {
	setObserverReaction(observe, function $disposedObserverGuardReaction() {
		throw new Error("Attempt to call a disposed observer!");
	});

	observers[observe[observerId]] = null;
}

function setObserverReaction(observe, reaction) {
	observe[reactionKey] = reaction;
}

/**
 * Отвобождает переданный объект
 * @param object
 */
export function dispose(object: object | ((...args: any) => any)) {
	if (typeof object === "function") {
		// Снимаем observer
		disposeObserver(object);
		return;
	}

	if (!object || typeof object !== "object" || !object[viewsKey]) {
		return;
	}

	// Снимаем observers от views
	Object.keys(object[viewsKey]).forEach((name) => {
		const viewData = object[viewsKey][name];
		disposeObserver(viewData.observer);
	});

	// Выставляем флаг disposed
	object[disposedKey] = true;
}

export function attachView(object, name, view) {
	return makeView(object, name, view, true);
}

export function getAllObservers() {
	return observers;
}
