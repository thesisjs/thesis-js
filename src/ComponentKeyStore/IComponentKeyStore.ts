import {IComponent, IComponentConstructor} from "../Component/IComponent";

export interface IComponentKeyStore {
	nextKeyFor(constructor: IComponentConstructor): string;
	save(key: string | number, instance: IComponent): void;
	collectGarbage(): void;
	clear(): void;
	dispose(): void;
}
