
export type AttrChangedHandler<T> = (prevValue: T, nextValue: T) => void;

export type IAttrChanged<P extends object> = {
	[name in keyof P]: AttrChangedHandler<P[name]>;
};
