
export type RemitHandler = EventListener;

export interface IRemitHandlers {
	[type: string]: RemitHandler;
}
