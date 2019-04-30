
export interface IEvents {
	[name: string]: string | ((...args: any) => any);
}
