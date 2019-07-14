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
import {getActiveInstance, hasActiveInstance, popActiveInstance, pushActiveInstance} from "../Element/Element";
import {DevTools} from "../utils/devTools";

import {IComponent} from "./IComponent";

export abstract class Component<P extends object> implements IComponent {

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
		const mark = DevTools.mark(`🎓 ${DevTools.getName(this)}: update`);

		const admin = this[ADMINISTRATOR_KEY];

		// Обновление верхнего уровня, то есть мы должны в начале создать
		// очередь на mount/update, а в конце её выполнить
		// Вложенные обновления получат нашу очередь
		const isTopLevelUpdate = !hasActiveInstance();

		if (!renderContext) {
			if (!isTopLevelUpdate) {
				renderContext = getActiveInstance()[ADMINISTRATOR_KEY].renderContext;

				// TODO: Разобраться
				if (!renderContext) {
					renderContext = new RenderContext();
				}
			} else {
				renderContext = new RenderContext();
			}
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

			// Добавляем предыдущие внешние слушатели событий
			this[ADMINISTRATOR_KEY].initExternalEvents(this[ADMINISTRATOR_KEY].externalEvents);
		}

		assert(
			admin.virtualNode.tag !== undefined,
			"Fragments are not currently supported",
		);

		if (render) {
			// Не забываем записываться в очередь на didUpdate
			renderContext.scheduleUpdate(this);
		}

		if (render && isTopLevelUpdate && prevVirtualNode.dom) {
			// Обновляем vdom
			vdom.update(prevVirtualNode, admin.virtualNode);
		}

		if (render && isTopLevelUpdate) {
			renderContext.fireAll();
		}

		mark.measure();
	}

	/**
	 * Отправляет пользовательское событие вышестоящим компонентам
	 * @param type
	 * @param detail
	 */
	public broadcast(type: string, detail?: any) {
		const mark = DevTools.mark(`🎓 ${DevTools.getName(this)}: broadcast`);

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

		mark.measure();
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
		const mark = DevTools.mark(`🎓 ${DevTools.getName(this)}: set`);

		// Это всё заворачивается в action при инициализации, так что реакция
		// будет только одна (если будет вообще)

		// tslint:disable-next-line:forin
		for (const name in newAttrs) {
			this.attrs[name] = newAttrs[name];
		}

		mark.measure();
	}

	protected createFragment(renderContext: IRenderContext) {
		const admin = this[ADMINISTRATOR_KEY];

		pushActiveInstance(this);
		admin.renderContext = renderContext;

		const mark = DevTools.mark(`🎓 ${DevTools.getName(this)}: render`);

		const virtualNode = this.render();

		mark.measure();

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

		// Подписываемся на стороннее изменение блока
		// Нужно, чтобы актуализировать собственный virtualNode
		addVirtualEventListener(
			virtualNode,
			"$changed",
			admin.handleVirtualEvent,
		);

		virtualNode.component = this;
		virtualNode.key = admin.key;

		admin.virtualNode = virtualNode;
	}

}
