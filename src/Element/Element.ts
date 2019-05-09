import {IComponent, IComponentConstructor} from "../Component/IComponent";
import {ADMINISTRATOR_KEY} from "../utils/componentKeys";
import {IVirtualNode} from "../../vendor/cito";
import {camelToDashInObject} from "../utils/convertCase";
import {addVirtualEventListener} from "../utils/citoEvents";
import {Component} from "../Component/Component";

import {IElement} from "./IElement";

// Стек активных инстансов
const activeInstances: IComponent[] = [];

export function pushActiveInstance(component: IComponent) {
	activeInstances.push(component);
}

export function popActiveInstance(): IComponent {
	return activeInstances.pop();
}

export function getActiveInstance(): IComponent {
	return activeInstances[activeInstances.length - 1];
}

export function createElement(
	tag: string | IComponentConstructor,
	attrs?: {[name: string]: any},
	...children: IElement[]
): IElement {
	const isComponent = typeof tag !== "string";
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

	// Инстанс, который сейчас рендерится
	const activeInstance = getActiveInstance();
	const activeAdmin = activeInstance[ADMINISTRATOR_KEY];

	let virtualNode: IVirtualNode;
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
			events[eventName] = function $eventHandler(handler, event) {
				(event as any).stopPropagation();

				const handlerType = typeof handler;

				if (!handler) {
					return;
				}

				switch (handlerType) {
					case "function": return handler(event);
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
		// ==== Случай, когда рисуем простую ноду (это можно и без ключа) ====

		// Переименовываем className в class для совместимости с JSX
		if (hasAttrs && attrs.className !== undefined) {
			attrs.class = attrs.className;
			delete attrs.className;
		}

		// Преобразуем имена атрибутов в dash-case
		if (hasAttrs && attrs.style && typeof attrs.style === "object") {
			attrs.style = camelToDashInObject(attrs.style);
		}

		virtualNode = {
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

		return virtualNode as IElement;
	}

	// ==== Остальное относится к случаю, когда рисуем компонент ====

	attrs.children = children;

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
	virtualNode = instance[ADMINISTRATOR_KEY].virtualNode;

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

	return virtualNode as IElement;
}
