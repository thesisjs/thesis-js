import {IComponent, IComponentConstructor} from "../Component/IComponent";
import {ADMINISTRATOR_KEY} from "../utils/componentKeys";
import {vdom} from "../../vendor/cito";
import {camelToDashInObject} from "../utils/convertCase";
import {addVirtualEventListener} from "../utils/citoEvents";
import {ISystemAttrs} from "../commons/ISystemAttrs";
import {RenderContext} from "../RenderContext/RenderContext";
import {getComponentInstance, saveComponentInstance} from "../ComponentAdministrator/ComponentAdministrator";

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

export function hasActiveInstance(): boolean {
	return !!activeInstances.length;
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
	// Нормализируем атрибуты, создаём ключ
	attrs = attrs || {};
	attrs = {
		...attrs,
		key: lastRootKey++,
	};

	// Создаём компонент
	const instance = new constructor(attrs);

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

function $eventHandler(handler, component, event) {
	// Ничего не делаем, если компонент, к которому относится обработчик, уже не в DOM
	if (component && !component[ADMINISTRATOR_KEY].isMounted()) {
		return;
	}

	// TODO: !DEPRECATE!
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
}

/**
 * Функция создаёт обработчик события, который умеет отменять всплытие
 * @param attrs
 * @param name
 */
function createEventListener(attrs: { [p: string]: any }, name) {
	return $eventHandler.bind(null, getActiveInstance(), attrs[name]);
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
	// Для компонентов без атрибутов
	if (!attrs || typeof attrs !== "object") {
		attrs = {};
	}

	attrs.children = children;
	attrs.key = key;

	// Инстанс, который сейчас рендерится
	const activeInstance = getActiveInstance();
	const activeAdmin = activeInstance[ADMINISTRATOR_KEY];

	let instance = getComponentInstance(key);

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
	saveComponentInstance(key, instance);

	const virtualNode = instance[ADMINISTRATOR_KEY].virtualNode;

	// Инициализируем ref с этим компонентом у родительского, если он есть
	if (ref !== undefined) {
		activeAdmin.initRef(ref, virtualNode, true);
	}

	// Добавляем обработчики событий компоненту
	instance[ADMINISTRATOR_KEY].initExternalEvents(events);

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
	const newChildren = [];

	// tslint:disable-next-line:prefer-for-of
	for (let i = 0; i < children.length; i++) {
		if (
			children[i] === null ||
			children[i] === undefined ||
			children[i] === false ||
			children[i] === ""
		) {
			continue;
		}

		if (
			typeof children[i] === "number" ||
			typeof children[i] === "boolean"
		) {
			// Случай, когда нужно превратить строку в число
			// TODO: Предупреждение, что так делать нельзя в цикле, т.к. у каждый ноды должен быть ключ
			newChildren.push(String(children[i]) as any);

			continue;
		}

		if (Array.isArray(children[i])) {
			// Случай, когда нужно развернуть вложенные массивы в плоский
			newChildren.push.apply(
				newChildren,
				normalizeChildren(children[i] as any, attrs),
			);

			continue;
		}

		newChildren.push(children[i]);
	}

	return newChildren;
}

/**
 * Удаляет пустые (undefined) атрибуты
 */
function normalizeAttrs(attrs) {
	const newAtts = {};

	for (const key in attrs) {
		if (attrs[key] !== undefined) {
			newAtts[key] = attrs[key];
		}
	}

	return newAtts;
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

	attrs = hasAttrs && normalizeAttrs(attrs);
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

		// Удаляем key из атрибутов узла, чтобы он ен попал в DOM
		if (key !== undefined) {
			delete attrs.key;
		}

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

	if (isComponent) {
		// Генерируем компоненту ключ

		if (key === undefined) {
			key = activeAdmin.keyStore.nextKeyFor(
				tag as IComponentConstructor,
			);
		} else {
			key = "$" + key;
		}

		key = activeAdmin.key + ":" + key;
	} else {
		// Случай, когда рисуем простую ноду (это можно и без ключа)
		return initVirtualNode(tag as string, attrs, children, events, key, ref);
	}

	// Остальное относится к случаю, когда рисуем компонент
	return initComponent(tag as IComponentConstructor, attrs, children, events, key, ref);
}
