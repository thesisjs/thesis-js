import {
	ATTRS_KEY as attrsKey,
	VIEWS_KEY as viewsKey,
} from "../utils/observableKeys";
import {DevTools} from "../utils/devTools";

let callQueue = [];

function callReactions(observers) {
	let mark;

	const observersCalled = {};
	const localCallQueue = callQueue;
	callQueue = [];

	// Вызываем observable из очереди
	for (const observerId of localCallQueue) {
		if (!observersCalled[observerId]) {
			observersCalled[observerId] = true;

			if (observers[observerId]) {
				mark = DevTools.mark(`🎓 ${observers[observerId].name}: reaction`);

				observers[observerId]();

				mark.measure();
			}
		}
	}
}

export function makeObservableAdministrator(object, observableStack, observers) {
	return {
		observers: [],
		trackedAttrs: {},

		trackHook(name) {
			const attrs = object[attrsKey];
			const views = object[viewsKey];
			const attrObservers = this.trackedAttrs[name];
			let lastObservable;

			// Если мы внутри observable
			if (observableStack.length) {
				lastObservable = observableStack[observableStack.length - 1];

				// Сохраняем id текущей observable в trackedAttrs
				if (!attrObservers) {
					this.trackedAttrs[name] = [lastObservable];
				} else {
					attrObservers.push(lastObservable);
				}
			}

			if (views[name]) {
				// Возвращаем значение view
				return views[name].getter();
			}

			return attrs[name];
		},

		reactHook(name, value, viewComputationStack, actionCount) {
			const attrs = object[attrsKey];

			// Обновляем значение, если не вычисляем computed value
			if (!viewComputationStack) {
				attrs[name] = value;
			}

			const attrsObservers = this.trackedAttrs[name];

			if (attrsObservers) {
				// Добавляем в очередь вызовов observers на этот атрибут
				this.trackedAttrs[name] = null;
				Array.prototype.push.apply(callQueue, attrsObservers);
			}

			// Если не в экшне, вызовем реакции
			if (!actionCount) {
				callReactions(observers);
			}
		},

		callReactionsHook() {
			callReactions(observers);
		},
	};
}
