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
import {addVirtualEventListener, removeVirtualEventListener} from "../utils/citoEvents";
import {DevTools} from "../utils/devTools";

import {IComponentAdministrator} from "./IComponentAdministrator";

const instances: {[key: string]: IComponent} = {};

export function getComponentInstances() {
	return instances;
}

export function getComponentInstance(key: string) {
	return instances[key];
}

export function saveComponentInstance(key: string, instance: IComponent) {
	instances[key] = instance;
}

export function removeComponentInstance(key: string) {
	delete instances[key];
}

export class ComponentAdministrator<P extends object> implements IComponentAdministrator {
	public component: IComponent;
	public key;
	public keyStore = new ComponentKeyStore();
	public remitHandlers = {};
	public renderContext;
	public virtualNode;
	public externalEvents;

	private mounted: boolean = false;
	private destroyed: boolean = false;

	constructor(component: IComponent, attrs: Partial<IAttrs<P> & ISystemAttrs>) {
		this.component = component;
		this.key = attrs.key;
	}

	public handleVirtualEvent(virtualEvent: IVirtualEvent) {
		switch (virtualEvent.type) {
			case "$destroyed": {
				this.destroyComponent();
				break;
			}

			case "$changed": {
				this.virtualNode = virtualEvent.virtualNode;
				break;
			}
		}
	}

	public initExternalEvents(events: object) {
		// Удаляем старые события
		if (this.externalEvents) {
			// tslint:disable-next-line:forin
			for (const eventName in this.externalEvents) {
				removeVirtualEventListener(
					this.virtualNode,
					eventName,
					this.externalEvents[eventName],
				);
			}
		}

		this.externalEvents = events;

		// Добавляем новые
		if (events) {
			// tslint:disable-next-line:forin
			for (const eventName in events) {
				addVirtualEventListener(
					this.virtualNode,
					eventName,
					events[eventName],
				);
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

				// Сначала выполняем setter
				observableSetter(value);

				// Потом side effect
				if (prevValue !== value && this.isMounted()) {
					handler.apply(this.component, [value, prevValue]);
				}
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
		if (!this.destroyed) {
			this.mounted = true;
			this.callLifecycleMethod("didMount");
		}
	}

	public callUpdate() {
		if (!this.destroyed && this.isMounted()) {
			this.callLifecycleMethod("didUpdate");
		}
	}

	public callUnmount() {
		this.callLifecycleMethod("didUnmount");
	}

	public destroyComponent() {
		if (this.destroyed) {
			return;
		}

		this.mounted = false;
		this.destroyed = true;

		// Убираем реактивность с forceUpdate
		dispose(this.component.forceUpdate);

		// Удаляем из глобальной коллекции инстансов
		delete instances[this.key];

		// Вызываем метод жизненного цикла
		this.callUnmount();

		// Удаляем детей
		this.keyStore.dispose();

		// Освобождаем attrs в конце потому, что они могли понадобиться в didUnmount
		dispose(this.component.attrs);
	}

	public isMounted(): boolean {
		return this.mounted;
	}

	private callLifecycleMethod(name: "didMount" | "didUpdate" | "didUnmount") {
		const mark = DevTools.mark(`🎓 ${DevTools.getName(this.component)}: ${name}`);

		const method = (this.component as IComponent)[name];

		if (typeof method === "function") {
			// TODO: try-catch
			method.apply(this.component);
		}

		mark.measure();
	}

}
