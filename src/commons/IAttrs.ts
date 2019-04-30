
export type IAttrs<P extends object> = {
	[name in keyof P]: P[name];
};
