import {RenderContext} from "../RenderContext/RenderContext";
import {IRenderContext} from "../RenderContext/IRenderContext";
import {IAttrs} from "../commons/IAttrs";
import {ISystemAttrs} from "../commons/ISystemAttrs";
import {vdom, IVirtualNode} from "../../vendor/cito";
import {IAttrChanged} from "../commons/IAttrChanged";
import {assert} from "../utils/assert";
import {IRefs} from "../commons/IRefs";
import {addVirtualEventListener} from "../utils/citoEvents";
import {camelToDashInObject} from "../utils/convertCase";
import {ADMINISTRATOR_KEY} from "../utils/componentKeys";
import {ComponentAdministrator} from "../ComponentAdministrator/ComponentAdministrator";

import {IComponent, IComponentConstructor} from "./IComponent";

interface IElement extends IVirtualNode {
	component?: Component<any>;
}

export type Element = IElement;

export abstract class Component<P extends object> implements IComponent {

	public static instances: {[key: string]: Component<any>} = {};

	public static createElement(
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
		const activeInstance = Component.activeInstances[Component.activeInstances.length - 1];
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

	// Стек активных инстансов
	private static activeInstances: Array<Component<any>> = [];

	public readonly [ADMINISTRATOR_KEY];
	public readonly attrs: Partial<IAttrs<P> & ISystemAttrs>;

	public readonly attrChanged: Partial<IAttrChanged<P>> = {};
	public readonly defaults: Partial<IAttrs<P>> = {};
	public readonly refs: IRefs = {};

	constructor(attrs: Partial<IAttrs<P> & ISystemAttrs> = {}) {
		this[ADMINISTRATOR_KEY] = new ComponentAdministrator(this, attrs);

		// Инициализация компонента находится в this[ADMINISTRATOR_KEY].initAttrs
	}

	public abstract render(): IVirtualNode;

	public forceUpdate(
		renderContext?: IRenderContext,
		{render} = {render: true},
	) {
		const admin = this[ADMINISTRATOR_KEY];

		// Обновление верхнего уровня, то есть мы должны в начале создать
		// очередь на mount/update, а в конце её выполнить
		// Вложенные обновления получат нашу очередь
		const isTopLevelUpdate = !renderContext;

		if (isTopLevelUpdate) {
			renderContext = new RenderContext();
		}

		// Сохраняем старую ноду (для случая фрагмента)
		const prevVirtualNode = admin.virtualNode;
		// Выполняем шаблон
		this.createFragment(renderContext);

		if (prevVirtualNode) {
			assert(
				admin.virtualNode.tag === prevVirtualNode.tag,
				"Component cannot change it's root tag name",
			);
		}

		assert(
			admin.virtualNode.tag !== undefined,
			"Fragments are not currently supported",
		);

		if (render && isTopLevelUpdate) {
			// Не забываем записываться в очередь на didUpdate
			renderContext.scheduleUpdate(this);
		}

		if (render) {
			// Обновляем vdom
			vdom.update(prevVirtualNode, admin.virtualNode);
		}

		if (isTopLevelUpdate) {
			renderContext.fireAll();
		}
	}

	/**
	 * Отправляет пользовательское событие вышестоящим компонентам
	 * @param type
	 * @param detail
	 */
	public broadcast(type: string, detail?: any) {
		const admin = this[ADMINISTRATOR_KEY];

		assert(
			admin.virtualNode.dom,
			"Cannot emit event on an unmounted component.",
		);

		admin.virtualNode.dom.dispatchEvent(
			new CustomEvent(type.toLowerCase(), {
				bubbles: false,
				detail,
			}),
		);
	}

	/**
	 * Возвращает обработчик события, преобразовывающий DOM событие в пользовательское
	 * @param {string} newType - новое имя события
	 */
	public remit(newType: string) {
		const admin = this[ADMINISTRATOR_KEY];

		if (admin.remitHandlers[newType]) {
			return admin.remitHandlers[newType];
		}

		newType = newType.toLowerCase();
		const this_ = this;

		// TODO: Делегировать события?
		const remitImpl = function $remit(event: Event) {
			event.stopPropagation();
			this_.broadcast(newType, {originalEvent: event});
		};

		admin.remitHandlers[newType] = remitImpl;

		return remitImpl;
	}

	public set(newAttrs: Partial<IAttrs<P>>) {
		// Это всё заворачивается в action при инициализации, так что реакция
		// будет только одна (если будет вообще)

		// tslint:disable-next-line:forin
		for (const name in newAttrs) {
			this.attrs[name] = newAttrs[name];
		}
	}

	protected createFragment(renderContext: IRenderContext) {
		const admin = this[ADMINISTRATOR_KEY];

		Component.activeInstances.push(this);
		admin.renderContext = renderContext;

		const virtualNode = this.render();

		admin.renderContext = undefined;
		Component.activeInstances.pop();

		admin.keyStore.clear();

		// Подписываемся на уничтожение блока
		addVirtualEventListener(
			virtualNode,
			"$destroyed",
			admin.handleVirtualEvent,
		);

		virtualNode.component = this;
		admin.virtualNode = virtualNode;
	}

}
