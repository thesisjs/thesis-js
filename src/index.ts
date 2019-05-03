import {vdom} from "../vendor/cito";

import {IComponent, IComponentConstructor} from "./Component/IComponent";
import {ISystemAttrs} from "./commons/ISystemAttrs";
import {RenderContext} from "./RenderContext/RenderContext";
import {Component} from "./Component/Component";
import {observable, observer, dispose as disposeImpl, attachView} from "./Observable/Observable";
export {Component, Element} from "./Component/Component";

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
	// Вызываем шаблон компонента
	(instance as any).createFragment(renderContext);

	// Очищаем контейнер
	while (target.firstChild) {
		target.removeChild(target.firstChild);
	}

	// Рисуем компонент в контейнере
	vdom.append(target, (instance as any).virtualNode);
	// Сохраняем ссылку на компонент в контейнере
	markRootComponent(instance);
	// Выполняем колбеки
	renderContext.fireAll();

	return instance;
}

export function unmountComponentAtNode(node: Node) {
	const component = getMountedRootComponent(node.firstChild);
	unmarkRootComponent(component);
	vdom.remove((component as any).virtualNode);
}

export const createElement = Component.createElement;

export function createObservable(fields: any) {
	return observable(fields);
}

export function createObserver(func: (...args: any) => any) {
	return observer(func);
}

export function createObservableView(
	object,
	name: string,
	implementation: (...args: any) => any,
): typeof object {
	return attachView(object, name, implementation);
}

export function dispose(anything: any) {
	disposeImpl(anything);
}
