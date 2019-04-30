
export type IAttrChanged<P extends object> = {
	[name in keyof P]: (prevValue: P[name], nextValue: P[name]) => void;
};
