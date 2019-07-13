import {vdom} from "../vendor/cito";

import {IComponent} from "./Component/IComponent";
import {Component} from "./Component/Component";
import {IModel, IModelConstructor} from "./Model/IModel";
import {Model} from "./Model/Model";
import {ADMINISTRATOR_KEY} from "./utils/componentKeys";
import {installSymbolPolyfill} from "./utils/symbol";
import {getMountedRootComponent, unmarkRootComponent} from "./Element/Element";
import {dispose as disposeAnyObservable} from "./Observable/Observable";
import {disposeModelLike} from "./utils/disposeModelLike";

export {
	createObservable,
	createObserver,
	createAction,
	createAsyncAction,
	createObservableView,
} from "./Observable/Observable";
export {IElement as Element} from "./Element/IElement";
export {createElement, createComponentElement as createComponent} from "./Element/Element";
export {Component} from "./Component/Component";
export {Model, View, Action, AsyncAction, ControlledModel} from "./Model/Model";
export {ModelList} from "./ModelList/ModelList";
export {ModelMap} from "./ModelMap/ModelMap";

installSymbolPolyfill();

export function unmountComponentAtNode(node: Node) {
	const component = getMountedRootComponent(node.firstChild);

	if (component) {
		unmarkRootComponent(component);
		vdom.remove(component[ADMINISTRATOR_KEY].virtualNode);
	}
}

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
		component[ADMINISTRATOR_KEY] &&
		typeof component[ADMINISTRATOR_KEY] === "object" &&
		component[ADMINISTRATOR_KEY].virtualNode &&
		typeof component[ADMINISTRATOR_KEY].virtualNode === "object"
	) {
		return component[ADMINISTRATOR_KEY].virtualNode.dom as HTMLElement;
	}

	return undefined;
}

/**
 * Возвращает true, если компонент находится на странице
 * @param component
 */
export function isComponentMounted(component: IComponent): boolean {
	if (
		component &&
		typeof component === "object" &&
		component[ADMINISTRATOR_KEY] &&
		typeof component[ADMINISTRATOR_KEY] === "object"
	) {
		return component[ADMINISTRATOR_KEY].isMounted();
	}
}

export function dispose(obj: any) {
	disposeModelLike(obj) || disposeAnyObservable(obj);
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
