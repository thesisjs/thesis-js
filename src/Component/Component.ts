import {IAttrChanged} from "../commons/IAttrChanged";
import {IEvents} from "../commons/IEvents";
import {IAttrs} from "../commons/IAttrs";
import {ISystemAttrs} from "../commons/ISystemAttrs";
import {vdom, IVirtualEvent, IVirtualNode} from "../../vendor/cito";
import {IRenderContext} from "../RenderContext/IRenderContext";
import {IComponentKeyStore} from "../ComponentKeyStore/IComponentKeyStore";
import {ComponentKeyStore} from "../ComponentKeyStore/ComponentKeyStore";
import {RenderContext} from "../RenderContext/RenderContext";
import {assert} from "../utils/assert";

import {IComponent, IComponentConstructor} from "./IComponent";

interface IElement extends IVirtualNode {
	component?: Component<any>;
}

const instances: {[key: string]: Component<any>} = {};

export type Element = IElement;

export abstract class Component<P extends object & ISystemAttrs> implements IComponent, EventListenerObject {

	public static createElement(
		tag: string | IComponentConstructor,
		attrs?: {[name: string]: any},
		...children: IElement[]
	): IElement {
		// Нормализация детей
		for (let i = 0; i < children.length; i++) {
			if (children[i] === null || children[i] === undefined) {
				children[i] = "" as any;
			} else if (typeof children[i] === "number") {
				children[i] = String(children[i]) as any;
			}
		}

		const isComponent = typeof tag !== "string";
		const {activeInstance} = Component;
		let key;

		if (attrs && typeof attrs === "object") {
			key = attrs.key;
		}

		if (isComponent && !key) {
			key = activeInstance.key + ":" + activeInstance.keyStore.nextKeyFor(tag as IComponentConstructor);
		} else if (!isComponent) {
			return {
				attrs,
				children,
				key: key
					? activeInstance.key + ":" + key
					: undefined,
				tag: tag as string,
			};
		}

		attrs.children = children;

		let instance = instances[key];

		if (!instance) {
			// Компонента не было, создаём
			instance = new (tag as any)(attrs);
			// Первый раз создаём фрагмент руками
			instance.createFragment(activeInstance.renderContext);

			activeInstance.renderContext.scheduleMount(instance);
		} else {
			// Компонент был, обновляем
			// tslint:disable-next-line:forin
			for (const name in attrs) {
				instance.attrs[name] = attrs[name];
			}

			// К этому моменту у него уже должен был произойти вызов createFragment
			// Так как реактивность

			activeInstance.renderContext.scheduleUpdate(instance);
		}

		instances[key] = instance;

		return (instance as any).virtualNode;
	}

	private static activeInstance: Component<any>;

	public attrs: Partial<IAttrs<P>> = {};

	protected attrChanged: Partial<IAttrChanged<P>> = {};
	protected defaults: Partial<IAttrs<P>> = {};
	protected events: IEvents = {};

	private key: string;
	private virtualNode?: IVirtualNode;
	private keyStore: IComponentKeyStore = new ComponentKeyStore();
	private renderContext?: IRenderContext;

	constructor(attrs: Partial<IAttrs<P>> = {}) {
		this.attrs = {
			...this.defaults,
			...attrs,
		};

		this.key = attrs.key;

		this.handleVirtualEvent = this.handleVirtualEvent.bind(this);
	}

	public abstract render(): IVirtualNode;

	// tslint:disable-next-line:no-empty
	public didMount() {}
	// tslint:disable-next-line:no-empty
	public didUpdate() {}
	// tslint:disable-next-line:no-empty
	public didUnmount() {}

	public forceUpdate() {
		// Сохраняем старую ноду (для случая фрагмента)
		const prevVirtualNode = this.virtualNode;

		// Создаём контекст отрисовки
		const renderContext = new RenderContext();
		// Выполняем шаблон
		this.createFragment(renderContext);

		assert(
			this.virtualNode.tag === prevVirtualNode.tag,
			"Component cannot change it's root tag name",
		);

		assert(
			this.virtualNode.tag !== undefined,
			"Fragments are not currently supported",
		);

		// Обновляем vdom
		vdom.update(prevVirtualNode, this.virtualNode);
	}

	public handleEvent(event: Event) {
		const handler = this.events[event.type];

		// Прокинули имя метода
		if (typeof handler === "string") {
			return (this as any)[handler](event);
		}

		// Прокинули сам метод
		if (typeof handler === "function") {
			return handler(event);
		}

		return true;
	}

	protected createFragment(renderContext: IRenderContext) {
		Component.activeInstance = this;
		this.renderContext = renderContext;
		const virtualNode = this.render();
		this.renderContext = undefined;
		Component.activeInstance = undefined;

		this.keyStore.clear();

		// Подписываемся на уничтожение блока
		virtualNode.events = {
			$created: this.handleVirtualEvent,
			$destroyed: this.handleVirtualEvent,
		};

		this.virtualNode = virtualNode;
	}

	private handleVirtualEvent(virtualEvent: IVirtualEvent) {
		switch (virtualEvent.type) {
			case "$created": {
				// Устанавливаем обработчики событий
				const node = this.virtualNode.dom;

				// tslint:disable-next-line:forin
				for (const name in this.events) {
					node.addEventListener(name, this);
				}

				break;
			}

			case "$destroyed": {
				// Снимаем обработчики событий
				const node = this.virtualNode.dom;

				// tslint:disable-next-line:forin
				for (const name in this.events) {
					node.removeEventListener(name, this);
				}

				// Удаляем из глобальной коллекции инстансов
				delete instances[this.key];
				// Вызываем метод жизненного цикла
				this.didUnmount();

				break;
			}
		}
	}
}
