import {IComponentConstructor} from "../Component/IComponent";

export interface IComponentKeyStore {
	nextKeyFor(constructor: IComponentConstructor): string;
	clear(): void;
}
