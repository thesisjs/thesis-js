import {Component} from "../Component/Component";
import {ComponentKeyStore} from "../ComponentKeyStore/ComponentKeyStore";
import {IVirtualEvent} from "../../vendor/cito";
import {IElement} from "../Element/IElement";
import {IAttrs} from "../commons/IAttrs";
import {ISystemAttrs} from "../commons/ISystemAttrs";
import {
	createAction,
	createObservable,
	createObserver,
	dispose,
	getRawAtomValue,
} from "../Observable/Observable";
import {IComponent} from "../Component/IComponent";
import {assert} from "../utils/assert";
import {addVirtualEventListener} from "../utils/citoEvents";

import {IComponentAdministrator} from "./IComponentAdministrator";

export class ComponentAdministrator<P extends object> implements IComponentAdministrator {
	public component: Component<P>;
	public key;
	public keyStore = new ComponentKeyStore();
	public remitHandlers = {};
	public renderContext;
	public virtualNode;

	constructor(component: Component<P>, attrs: Partial<IAttrs<P> & ISystemAttrs>) {
		this.component = component;
		this.key = attrs.key;
	}

	public handleVirtualEvent(virtualEvent: IVirtualEvent) {
		switch (virtualEvent.type) {
			case "$destroyed": {
				this.destroyComponent();
				break;
			}
		}
	}

	/**
	 * Инициализация обработчика attrChanged
	 * @param name
	 * @param handler
	 */
	public initAttrChanged(name: string, handler: (prevValue: any, nextValue: any) => void) {
		const descriptor = Object.getOwnPropertyDescriptor(this.component.attrs, name);

		assert(
			descriptor,
			"Cannot set attrChanged handler to an unknown attribute.",
		);

		assert(
			typeof handler === "function",
			"attrChanged handler must be a function.",
		);

		// Сохраним сеттер из observable
		const observableSetter = descriptor.set;

		/**
		 * Переопределим сеттер атрибута
		 * Вклиним вызов attrChanged на это свойство
		 */
		Object.defineProperty(this.component.attrs, name, {
			...descriptor,

			set: (value: any) => {
				const prevValue = getRawAtomValue(this.component.attrs, name);

				if (prevValue !== value) {
					handler.apply(this.component, [value, prevValue]);
				}

				observableSetter(value);
			},
		});
	}

	/**
	 * Инициализация в отдельном методе, чтобы вызвать её после того,
	 * как отработают все конструкторы
	 * @param attrs
	 */
	public initAttrs(attrs: object) {
		const {component} = this;

		(component as any).attrs = createObservable({
			children: undefined,
			...component.defaults,
			...attrs,
		});

		this.handleVirtualEvent = this.handleVirtualEvent.bind(this);

		component.forceUpdate = createObserver(component.forceUpdate.bind(component));
		component.set = createAction(component.attrs, component.set.bind(component));

		// tslint:disable-next-line:forin
		for (const name in component.attrChanged) {
			this.initAttrChanged(name, component.attrChanged[name]);
		}
	}

	/**
	 * Инициализация ref-а
	 * @param name
	 * @param node
	 * @param isComponent
	 */
	public initRef(name: string, node: IElement, isComponent: boolean) {
		addVirtualEventListener(node, "$created", () => {
			if (isComponent) {
				this.component.refs[name] = node.component;
			} else {
				this.component.refs[name] = node.dom as HTMLElement;
			}
		});

		addVirtualEventListener(node, "$destroyed", () => {
			delete this.component.refs[name];
		});
	}

	public callMount() {
		this.callLifecycleMethod("didMount");
	}

	public callUpdate() {
		this.callLifecycleMethod("didUpdate");
	}

	public callUnmount() {
		this.callLifecycleMethod("didUnmount");
	}

	public destroyComponent() {
		// Убираем реактивность с forceUpdate
		dispose(this.component.forceUpdate);

		// Удаляем из глобальной коллекции инстансов
		delete Component.instances[this.key];

		// Вызываем метод жизненного цикла
		this.callUnmount();

		// Освобождаем attrs в конце потому, что они могли понадобиться в didUnmount
		dispose(this.component.attrs);
	}

	private callLifecycleMethod(name: "didMount" | "didUpdate" | "didUnmount") {
		const method = (this.component as IComponent)[name];

		if (typeof method === "function") {
			// TODO: try-catch
			method.apply(this.component);
		}
	}

}
