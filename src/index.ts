import {vdom} from "../vendor/cito";

import {IComponent} from "./Component/IComponent";
import {Component} from "./Component/Component";
import {IModel, IModelConstructor} from "./Model/IModel";
import {Model} from "./Model/Model";
import {ADMINISTRATOR_KEY} from "./utils/componentKeys";
import {installSymbolPolyfill} from "./utils/symbol";
import {getMountedRootComponent, unmarkRootComponent} from "./Element/Element";

export {
	createObservable,
	createObserver,
	createAction,
	createObservableView,
	dispose,
} from "./Observable/Observable";
export {IElement as Element} from "./Element/IElement";
export {createElement, createComponentElement as createComponent} from "./Element/Element";
export {Component} from "./Component/Component";
export {Model, View, Action} from "./Model/Model";

installSymbolPolyfill();

export function unmountComponentAtNode(node: Node) {
	const component = getMountedRootComponent(node.firstChild);
	unmarkRootComponent(component);
	vdom.remove(component[ADMINISTRATOR_KEY].virtualNode);
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
		component[ADMINISTRATOR_KEY].virtualNode &&
		typeof component[ADMINISTRATOR_KEY].virtualNode === "object"
	) {
		return component[ADMINISTRATOR_KEY].virtualNode.dom as HTMLElement;
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
