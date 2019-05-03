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
import {IRefs} from "../commons/IRefs";
import {addVirtualEventListener} from "../utils/citoEvents";

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

		const isComponent = typeof tag !== "string";
		// Инстанс, который сейчас рендерится
		const activeInstance = Component.activeInstances[Component.activeInstances.length - 1];
		let virtualNode: IVirtualNode;
		let key;
		let ref;

		if (attrs && typeof attrs === "object") {
			key = attrs.key;
			ref = attrs.ref;

			// Удаляем ref из атрибутов узла, чтобы он не попал в DOM или в другой инстанс
			if (ref !== undefined) {
				delete attrs.ref;
			}
		}

		if (isComponent && !key) {
			// Генерируем компоненту ключ
			key = activeInstance.key + ":" + activeInstance.keyStore.nextKeyFor(
				tag as IComponentConstructor,
			);
		} else if (!isComponent) {
			// Случай, когда рисуем простую ноду (это можно и без ключа)
			virtualNode = {
				attrs,
				children,
				key: key
					? activeInstance.key + ":" + key
					: undefined,
				tag: tag as string,
			};

			// Инициализируем ref, если он есть
			if (ref !== undefined) {
				activeInstance.initRef(ref, virtualNode, false);
			}

			return virtualNode as IElement;
		}

		// Остальное относится к случаю, когда рисуем компонент

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
			instance.set(attrs);

			// К этому моменту у него уже должен был произойти вызов createFragment
			// Так как реактивность
		}

		// Добавляем компонент в глобальную коллекцию
		instances[key] = instance;
		virtualNode = (instance as any).virtualNode;

		// Инициализируем ref с этим компонентом у родительского, если он есть
		if (ref !== undefined) {
			activeInstance.initRef(ref, virtualNode, true);
		}

		return virtualNode as IElement;
	}

	// Стек активных инстансов
	private static activeInstances: Array<Component<any>> = [];

	public readonly attrs: Partial<IAttrs<P> & ISystemAttrs>;

	public attrChanged: Partial<IAttrChanged<P>> = {};
	public defaults: Partial<IAttrs<P>> = {};
	public events: IEvents = {};
	public refs: IRefs = {};

	private key: string;
	private virtualNode?: IVirtualNode;
	private keyStore: IComponentKeyStore = new ComponentKeyStore();
	private renderContext?: IRenderContext;

	constructor(attrs: Partial<IAttrs<P> & ISystemAttrs> = {}) {
		this.key = attrs.key;

		// Инициализация компонента находится в this.initAttrs
	}

	public abstract render(): IVirtualNode;

	public forceUpdate(
		renderContext?: IRenderContext,
		{render} = {render: true},
	) {
		// Обновление верхнего уровня, то есть мы должны в начале создать
		// очередь на mount/update, а в конце её выполнить
		// Вложенные обновления получат нашу очередь
		const isTopLevelUpdate = !renderContext;

		if (isTopLevelUpdate) {
			renderContext = new RenderContext();
		}

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

		if (render && isTopLevelUpdate) {
			// Не забываем записываться в очередь на didUpdate
			renderContext.scheduleUpdate(this);
		}

		if (render) {
			// Обновляем vdom
			vdom.update(prevVirtualNode, this.virtualNode);
		}

		if (isTopLevelUpdate) {
			renderContext.fireAll();
		}
	}

	public set(newAttrs: Partial<IAttrs<P>>) {
		// Это всё заворачивается в action при инициализации, так что реакция
		// будет только одна (если будет вообще)

		// tslint:disable-next-line:forin
		for (const name in newAttrs) {
			this.attrs[name] = newAttrs[name];
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
		Component.activeInstances.push(this);
		this.renderContext = renderContext;

		const virtualNode = this.render();

		this.renderContext = undefined;
		Component.activeInstances.pop();

		this.keyStore.clear();

		// Подписываемся на уничтожение блока
		addVirtualEventListener(virtualNode, "$created", this.handleVirtualEvent);
		addVirtualEventListener(virtualNode, "$destroyed", this.handleVirtualEvent);

		virtualNode.component = this;
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
			children: undefined,
			...this.defaults,
			...attrs,
		});

		this.handleVirtualEvent = this.handleVirtualEvent.bind(this);

		this.forceUpdate = createObserver(this.forceUpdate.bind(this));
		this.set = createAction(this.attrs, this.set.bind(this));
	}

	/**
	 * Инициализация ref-а
	 * @param name
	 * @param node
	 * @param isComponent
	 */
	private initRef(name: string, node: IVirtualNode, isComponent: boolean) {
		addVirtualEventListener(node, "$created", () => {
			if (isComponent) {
				this.refs[name] = node.component;
			} else {
				this.refs[name] = node.dom as HTMLElement;
			}
		});

		addVirtualEventListener(node, "$destroyed", () => {
			delete this.refs[name];
		});
	}

	private destroy() {
		// Убираем реактивность с forceUpdate
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
		const didUnmount = (this as IComponent).didUnmount;
		didUnmount && didUnmount.apply(this);

		// Освобождаем attrs в конце потому, что они могли понадобиться в didUnmount
		dispose(this.attrs);
	}
}
