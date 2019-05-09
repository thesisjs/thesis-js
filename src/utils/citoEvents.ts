import {IVirtualEvent, IVirtualNode, VirtualEventType} from "../../vendor/cito";

export function addVirtualEventListener(
	node: IVirtualNode,
	event: VirtualEventType | string,
	handler: (evt: IVirtualEvent) => any,
) {
	const eventsMap = node.events = node.events || {};
	let events: any = eventsMap[event] || [];

	if (!Array.isArray(events)) {
		events = [events];
	}

	events.push(handler);
	eventsMap[event] = events;
}
