// tslint:disable

import {IComponent} from "../src/Component/IComponent";

declare type VirtualEventHandler = (evt: IVirtualEvent) => void;

declare interface IVirtualNode {
	tag?: string;
	attrs?: object;
	events?: {[key: string]: VirtualEventHandler | VirtualEventHandler[]};
	children?: string | IVirtualNode[];
	key?: number | string;
	dom?: Node;
	component?: IComponent;
}

declare type VirtualEventType = "$created" | "$destroyed" | "$changed";

declare interface IVirtualEvent {
	type: VirtualEventType,
	target: Node,
	virtualNode: IVirtualNode,
}

export const vdom: {
	create(node: IVirtualNode): IVirtualNode;
	append(domParent: Node, node: IVirtualNode): IVirtualNode;
	update(oldNode: IVirtualNode, node: IVirtualNode): IVirtualNode;
	updateChildren(element: HTMLElement, children: IVirtualNode[]): IVirtualNode;
	remove(node: IVirtualNode): void;
};
