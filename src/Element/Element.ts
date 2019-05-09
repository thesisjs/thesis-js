import {IComponent, IComponentConstructor} from "../Component/IComponent";
import {ADMINISTRATOR_KEY} from "../utils/componentKeys";
import {IVirtualNode, vdom} from "../../vendor/cito";
import {camelToDashInObject} from "../utils/convertCase";
import {addVirtualEventListener} from "../utils/citoEvents";
import {Component} from "../Component/Component";
import {ISystemAttrs} from "../commons/ISystemAttrs";
import {RenderContext} from "../RenderContext/RenderContext";

import {IElement} from "./IElement";

// Стек активных инстансов
const activeInstances: IComponent[] = [];

let lastRootKey = 0;

// ==== Методы для работы со стеком активных компонентов ====

export function pushActiveInstance(component: IComponent) {
	activeInstances.push(component);
}

export function popActiveInstance(): IComponent {
	return activeInstances.pop();
}

export function getActiveInstance(): IComponent {
	return activeInstances[activeInstances.length - 1];
}

// ==== Методы для работы с корневым компонентом ====

export function isRootComponent(component: IComponent): boolean {
	const {virtualNode} =  component[ADMINISTRATOR_KEY];
	return virtualNode && virtualNode.dom && (virtualNode.dom as any).__componentInstance__;
}

export function markRootComponent(component: IComponent) {
	const node = component[ADMINISTRATOR_KEY].virtualNode.dom;
	(node as any).__componentInstance__ = component;
}

export function unmarkRootComponent(component: IComponent) {
	(component[ADMINISTRATOR_KEY].virtualNode.dom as any).__componentInstance__ = undefined;
}

export function getMountedRootComponent(node: Node): IComponent {
	return node && (node as any).__componentInstance__;
}

// ==== Методы для работы с элементами ====

/**
 * Основная точка входа Thesis
 * Экспортируется, как createComponent
 * @param constructor
 * @param target
 * @param attrs
 */
export function createComponentElement(
	constructor: IComponentConstructor,
	target: Node,
	attrs: any & ISystemAttrs,
): InstanceType<IComponentConstructor> {
	// Создаём компонент
	const instance = new constructor({
		...attrs,
		key: lastRootKey++,
	});

	// Создаём контекст отрисовки
	const renderContext = new RenderContext();
	// Настраиваем атрибуты
	instance[ADMINISTRATOR_KEY].initAttrs(attrs);
	// Вызываем шаблон компонента
	(instance as any).forceUpdate(renderContext, {render: false});

	// Очищаем контейнер
	while (target.firstChild) {
		target.removeChild(target.firstChild);
	}

	// Рисуем компонент в контейнере
	vdom.append(target, instance[ADMINISTRATOR_KEY].virtualNode);
	// Сохраняем ссылку на компонент в контейнере
	markRootComponent(instance);

	// Выполняем методы жизненного цикла
	renderContext.scheduleMount(instance);
	renderContext.fireAll();

	return instance;
}

/**
 * Функция создаёт обработчик события, который умеет отменять всплытие
 * @param attrs
 * @param name
 */
function createEventListener(attrs: { [p: string]: any }, name) {
	return function $eventHandler(handler, event) {
		(event as any).stopPropagation();

		const handlerType = typeof handler;

		if (!handler) {
			return;
		}

		switch (handlerType) {
			case "function":
				return handler(event);
			case "object": {
				if (
					handler.handleEvent &&
					typeof handler.handleEvent === "string"
				) {
					return handler.handleEvent(event);
				}

				break;
			}
		}
	}.bind(null, attrs[name]);
}

/**
 * Рисуем простую ноду
 * @param tag
 * @param attrs
 * @param children
 * @param events
 * @param key
 * @param ref
 */
function initVirtualNode(
	tag: string,
	attrs: {[name: string]: any},
	children: IElement[],
	events,
	key,
	ref,
): IElement {
	const hasAttrs = attrs && typeof attrs === "object";

	// Инстанс, который сейчас рендерится
	const activeInstance = getActiveInstance();
	const activeAdmin = activeInstance[ADMINISTRATOR_KEY];

	// Переименовываем className в class для совместимости с JSX
	if (hasAttrs && attrs.className !== undefined) {
		attrs.class = attrs.className;
		delete attrs.className;
	}

	// Преобразуем имена атрибутов в dash-case
	if (hasAttrs && attrs.style && typeof attrs.style === "object") {
		attrs.style = camelToDashInObject(attrs.style);
	}

	const virtualNode: IElement = {
		attrs,
		children,
		events,
		key: key
			? activeAdmin.key + ":" + key
			: undefined,
		tag: tag as string,
	};

	// Инициализируем ref, если он есть
	if (ref !== undefined) {
		activeAdmin.initRef(ref, virtualNode, false);
	}

	return virtualNode;
}

/**
 * Рисуем компонент
 * @param tag
 * @param attrs
 * @param children
 * @param events
 * @param key
 * @param ref
 */
function initComponent(
	tag: IComponentConstructor,
	attrs: {[name: string]: any},
	children: IElement[],
	events,
	key,
	ref,
): IElement {
	attrs.children = children;

	// Инстанс, который сейчас рендерится
	const activeInstance = getActiveInstance();
	const activeAdmin = activeInstance[ADMINISTRATOR_KEY];

	let instance = Component.instances[key];

	if (!instance) {
		// Компонента не было, создаём
		instance = new (tag as any)(attrs);
		// Инициализируем ему атрибуты
		instance[ADMINISTRATOR_KEY].initAttrs(attrs);
		// Первый раз создаём фрагмент руками
		instance.forceUpdate(activeAdmin.renderContext, {render: false});

		activeAdmin.renderContext.scheduleMount(instance);
	} else {
		// Компонент был, обновляем
		instance.set(attrs);

		// К этому моменту у него уже должен был произойти вызов createFragment
		// Так как реактивность
	}

	// Добавляем компонент в глобальную коллекцию
	Component.instances[key] = instance;
	const virtualNode = instance[ADMINISTRATOR_KEY].virtualNode;

	// Инициализируем ref с этим компонентом у родительского, если он есть
	if (ref !== undefined) {
		activeAdmin.initRef(ref, virtualNode, true);
	}

	// Добавляем обработчики событий компоненту
	if (events) {
		// tslint:disable-next-line:forin
		for (const eventName in events) {
			addVirtualEventListener(virtualNode, eventName, events[eventName]);
		}
	}

	return virtualNode;
}

function normalizeChildren(children: IElement[], attrs: {[p: string]: any}) {
	const hasAttrs = attrs && typeof attrs === "object";
	const hasInnerHTML = hasAttrs && typeof attrs.dangerouslySetInnerHTML === "object";

	// Заменяем детей на innerHTML, если передали нужный параметр
	if (hasInnerHTML) {
		children = [{
			children: attrs.dangerouslySetInnerHTML.__html,
			tag: "<",
		}];

		delete attrs.dangerouslySetInnerHTML;
	}

	// Нормализация детей
	for (let i = 0; i < children.length; i++) {
		if (children[i] === null || children[i] === undefined) {
			// Случай, когда нужно заменить null и undefined на пустую строку
			children[i] = "" as any;
		} else if (typeof children[i] === "number") {
			// Случай, когда нужно превратить строку в число
			children[i] = String(children[i]) as any;
		} else if (Array.isArray(children[i])) {
			// Случай, когда нужно развернуть вложенные массивы в плоский
			children.splice.apply(children, [i, 1].concat(children[i] as any));
			// Пройдёмся и по свежевставленным детям тоже
			i--;
		}
	}

	return children;
}

/**
 * Основная точка входа для JSX
 * @param tag
 * @param attrs
 * @param children
 */
export function createElement(
	tag: string | IComponentConstructor,
	attrs?: {[name: string]: any},
	...children: IElement[]
): IElement {
	const isComponent = typeof tag !== "string";
	const hasAttrs = attrs && typeof attrs === "object";

	children = normalizeChildren(children, attrs);

	// Инстанс, который сейчас рендерится
	const activeInstance = getActiveInstance();
	const activeAdmin = activeInstance[ADMINISTRATOR_KEY];

	let key;
	let ref;
	let events;

	if (hasAttrs) {
		key = attrs.key;
		ref = attrs.ref;

		// Удаляем ref из атрибутов узла, чтобы он не попал в DOM или в другой инстанс
		if (ref !== undefined) {
			delete attrs.ref;
		}

		let eventName;

		// Преобразуем обработчики событий
		for (const name in attrs) {
			if (!name.startsWith("on")) {
				continue;
			}

			if (!events) {
				events = {};
			}

			// Сохраним обработчик
			eventName = name.slice(2).toLowerCase();
			// TODO: Делегировать события?
			// TODO: Рефакторинг для производительности и экономии памяти
			events[eventName] = createEventListener(attrs, name);

			// Удалим из атрибутов
			delete attrs[name];
		}
	}

	if (isComponent && !key) {
		// Генерируем компоненту ключ
		key = activeAdmin.key + ":" + activeAdmin.keyStore.nextKeyFor(
			tag as IComponentConstructor,
		);
	} else if (!isComponent) {
		// Случай, когда рисуем простую ноду (это можно и без ключа)
		return initVirtualNode(tag as string, attrs, children, events, key, ref);
	}

	// Остальное относится к случаю, когда рисуем компонент
	return initComponent(tag as IComponentConstructor, attrs, children, events, key, ref);
}
