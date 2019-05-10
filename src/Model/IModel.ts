
export type ModelLifecycleMethod = () => void;

export interface IModel {
	pk: any;

	didCreate?: ModelLifecycleMethod;
	didDispose?: ModelLifecycleMethod;

	toJSON(): string;
	toPlainObject(): object;
	clone(): IModel;
}

export type IModelConstructor = new (attrs?: object) => IModel;
