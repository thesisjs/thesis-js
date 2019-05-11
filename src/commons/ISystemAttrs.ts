import {IVirtualNode} from "../../vendor/cito";

export interface ISystemAttrs {
	key?: string | number;
	ref?: string;
	children?: IVirtualNode | IVirtualNode[];
}
