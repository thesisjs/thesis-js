import {assert} from "../utils/assert";
import {RenderContext} from "../RenderContext/RenderContext";
import {IAttrs} from "../commons/IAttrs";
import {ISystemAttrs} from "../commons/ISystemAttrs";
import {vdom, IVirtualNode} from "../../vendor/cito";
import {IAttrChanged} from "../commons/IAttrChanged";
import {IRenderContext} from "../RenderContext/IRenderContext";
import {IRefs} from "../commons/IRefs";
import {addVirtualEventListener} from "../utils/citoEvents";
import {ADMINISTRATOR_KEY} from "../utils/componentKeys";
import {ComponentAdministrator} from "../ComponentAdministrator/ComponentAdministrator";
import {popActiveInstance, pushActiveInstance} from "../Element/Element";

import {IComponent} from "./IComponent";

export abstract class Component<P extends object> implements IComponent {

	public static instances: {[key: string]: Component<any>} = {};

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

		pushActiveInstance(this);
		admin.renderContext = renderContext;

		const virtualNode = this.render();

		admin.renderContext = undefined;
		// TODO: Проверка на испорченный стек
		popActiveInstance();

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
