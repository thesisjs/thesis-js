
export interface IModel {
	pk: any;
	toJSON(): string;
	toPlainObject(): object;
}

export type IModelConstructor = new (attrs?: object) => IModel;
