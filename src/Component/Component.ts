import {IRenderContext} from "../RenderContext/IRenderContext";
import {IAttrChanged} from "../commons/IAttrChanged";
import {IAttrs} from "../commons/IAttrs";
import {ISystemAttrs} from "../commons/ISystemAttrs";
import {vdom, IVirtualEvent, IVirtualNode} from "../../vendor/cito";
import {IEvents} from "../commons/IEvents";
import {IComponentKeyStore} from "../ComponentKeyStore/IComponentKeyStore";
import {ComponentKeyStore} from "../ComponentKeyStore/ComponentKeyStore";
import {RenderContext} from "../RenderContext/RenderContext";
import {assert} from "../utils/assert";
import {createAction, dispose, createObservable, createObserver} from "../Observable/Observable";

import {IComponent, IComponentConstructor} from "./IComponent";

interface IElement extends IVirtualNode {
	component?: Component<any>;
}

const instances: {[key: string]: Component<any>} = {};

export type Element = IElement;

export abstract class Component<P extends object> implements IComponent, EventListenerObject {

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
			// Инициализируем ему атрибуты
			instance.initAttrs(attrs);
			// Первый раз создаём фрагмент руками
			instance.forceUpdate(activeInstance.renderContext, {render: false});

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

	public readonly attrs: Partial<IAttrs<P> & ISystemAttrs>;

	public attrChanged: Partial<IAttrChanged<P>> = {};
	public defaults: Partial<IAttrs<P>> = {};
	public events: IEvents = {};

	private key: string;
	private virtualNode?: IVirtualNode;
	private keyStore: IComponentKeyStore = new ComponentKeyStore();
	private renderContext?: IRenderContext;

	constructor(attrs: Partial<IAttrs<P> & ISystemAttrs> = {}) {
		this.key = attrs.key;
	}

	public abstract render(): IVirtualNode;

	// tslint:disable-next-line:no-empty
	public didMount() {}
	// tslint:disable-next-line:no-empty
	public didUpdate() {}
	// tslint:disable-next-line:no-empty
	public didUnmount() {}

	public forceUpdate(
		renderContext: IRenderContext = new RenderContext(),
		{render} = {render: true},
	) {
		// Сохраняем старую ноду (для случая фрагмента)
		const prevVirtualNode = this.virtualNode;
		// Выполняем шаблон
		this.createFragment(renderContext);

		if (prevVirtualNode) {
			assert(
				this.virtualNode.tag === prevVirtualNode.tag,
				"Component cannot change it's root tag name",
			);
		}

		assert(
			this.virtualNode.tag !== undefined,
			"Fragments are not currently supported",
		);

		if (render) {
			// Обновляем vdom
			vdom.update(prevVirtualNode, this.virtualNode);
		}
	}

	public set(newState: Partial<IAttrs<P>>) {
		// TODO: Обернуть все методы компонента в Action
		// tslint:disable-next-line:forin
		for (const name in newState) {
			this.attrs[name] = newState[name];
		}
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
				this.destroy();
				break;
			}
		}
	}

	/**
	 * Инициализация в отдельном методе, чтобы вызвать её после того,
	 * как отработают все конструкторы
	 * @param attrs
	 */
	private initAttrs(attrs: Partial<IAttrs<P>> = {}) {
		(this as any).attrs = createObservable({
			...this.defaults,
			...attrs,
		});

		this.handleVirtualEvent = this.handleVirtualEvent.bind(this);

		this.forceUpdate = createObserver(this.forceUpdate.bind(this));
		this.set = createAction(this.attrs, this.set);
	}

	private destroy() {
		dispose(this.attrs);
		dispose(this.forceUpdate);

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
	}
}
