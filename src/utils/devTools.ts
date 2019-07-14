
const SUPPORTS_PERFORMANCE = (
	window.performance &&
	typeof window.performance === "object" &&
	typeof window.performance.now === "function" &&
	typeof window.performance.mark === "function" &&
	typeof window.performance.measure === "function"
);

class DevToolsMark {
	private static lastMarkId = 0;

	private static markName(id: number): string {
		return `__thesis::${id}`;
	}

	private readonly startTs: number = 0;
	private endTs: number = 0;

	private readonly startMarkId: number;
	private readonly endMarkId: number;

	constructor(
		private readonly name: string,
	) {
		this.startMarkId = DevToolsMark.lastMarkId++;
		this.endMarkId = DevToolsMark.lastMarkId++;

		if (SUPPORTS_PERFORMANCE) {
			this.startTs = performance.now();
			performance.mark(DevToolsMark.markName(this.startMarkId));
		}
	}

	public get duration(): number {
		return this.endTs - this.startTs;
	}

	public measure(): number {
		if (SUPPORTS_PERFORMANCE) {
			this.endTs = performance.now();

			performance.mark(DevToolsMark.markName(this.endMarkId));
			performance.measure(
				this.name,
				DevToolsMark.markName(this.startMarkId),
				DevToolsMark.markName(this.endMarkId),
			);
		}

		return this.duration;
	}
}

export class DevTools {
	public static mark(name: string): DevToolsMark {
		return new DevToolsMark(name);
	}

	public static getName(any: object): string {
		if (
			any &&
			typeof any === "object" &&
			any.constructor &&
			typeof any.constructor === "function"
		) {
			return any.constructor.name;
		}

		return "(anonymous)";
	}
}
