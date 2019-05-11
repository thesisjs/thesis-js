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

export function removeVirtualEventListener(
	node: IVirtualNode,
	event: VirtualEventType | string,
	handler: (evt: IVirtualEvent) => any,
) {
	if (!node.events || !node.events[event]) {
		return;
	}

	const events = node.events[event];

	if (Array.isArray(events)) {
		const eventIndex = events.indexOf(handler);

		if (eventIndex !== -1) {
			events.splice(eventIndex, 1);
		}
	} else {
		if (events === handler) {
			delete node.events[event];
		}
	}
}
