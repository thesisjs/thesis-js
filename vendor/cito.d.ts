// tslint:disable

declare interface IVirtualNode {
	tag?: string;
	attrs?: object;
	events?: {[key: string]: (evt: IVirtualEvent) => void};
	children?: string | IVirtualNode[];
	key?: number | string;
	dom?: Node;
}

declare interface IVirtualEvent {
	type: string,
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
