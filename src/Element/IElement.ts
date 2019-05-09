import {IVirtualNode} from "../../vendor/cito";
import {IComponent} from "../Component/IComponent";

export interface IElement extends IVirtualNode {
	component?: IComponent;
}
