import {vdom} from "../vendor/cito";

import {IComponent, IComponentConstructor} from "./Component/IComponent";
import {ISystemAttrs} from "./commons/ISystemAttrs";
import {RenderContext} from "./RenderContext/RenderContext";
import {Component} from "./Component/Component";
import {IModel, IModelConstructor} from "./Model/IModel";
import {Model} from "./Model/Model";

export {
	createObservable,
	createObserver,
	createAction,
	createObservableView,
	dispose,
} from "./Observable/Observable";
export {Component, Element} from "./Component/Component";
export {Model, View, Action} from "./Model/Model";

let lastRootKey = 0;

function isRootComponent(component: IComponent): boolean {
	const {virtualNode} =  component as any;
	return virtualNode && virtualNode.dom && virtualNode.dom.__componentInstance__;
}

function markRootComponent(component: IComponent) {
	const node = (component as any).virtualNode.dom;
	node.__componentInstance__ = component;
}

function unmarkRootComponent(component: IComponent) {
	(component as any).virtualNode.dom.__componentInstance__ = undefined;
}

function getMountedRootComponent(node: Node): IComponent {
	return node && (node as any).__componentInstance__;
}

export function createComponent(
	constructor: IComponentConstructor,
	target: Node,
	attrs: any & ISystemAttrs,
): InstanceType<IComponentConstructor> {
	// Создаём компонент
	const instance = new constructor({
		...attrs,
		key: lastRootKey++,
	});

	// Создаём контекст отрисовки
	const renderContext = new RenderContext();
	// Настраиваем атрибуты
	(instance as any).initAttrs(attrs);
	// Вызываем шаблон компонента
	(instance as any).forceUpdate(renderContext, {render: false});

	// Очищаем контейнер
	while (target.firstChild) {
		target.removeChild(target.firstChild);
	}

	// Рисуем компонент в контейнере
	vdom.append(target, (instance as any).virtualNode);
	// Сохраняем ссылку на компонент в контейнере
	markRootComponent(instance);

	// Выполняем методы жизненного цикла
	renderContext.scheduleMount(instance);
	renderContext.fireAll();

	return instance;
}

export function unmountComponentAtNode(node: Node) {
	const component = getMountedRootComponent(node.firstChild);
	unmarkRootComponent(component);
	vdom.remove((component as any).virtualNode);
}

export const createElement = Component.createElement;

export function createModel<T extends IModel>(
	constructor: IModelConstructor,
	attrs?: object,
) {
	return Model.create<T>(constructor, attrs);
}

/**
 * Находит DOM-узел, соответствующий переданному компоненту
 * @param component
 */
export function findDOMNode(component: IComponent): HTMLElement {
	if (
		component &&
		typeof component === "object" &&
		(component as any).virtualNode &&
		typeof (component as any).virtualNode === "object"
	) {
		return (component as any).virtualNode.dom;
	}

	return undefined;
}

// tslint:disable-next-line
export declare namespace JSX {
	// tslint:disable-next-line
	interface Element {
		attrs: {[propName: string]: any};
	}

	// tslint:disable-next-line
	interface IntrinsicElements {
		[name: string]: any;
	}
}
