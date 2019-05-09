import {IVirtualEvent, IVirtualNode} from "../../vendor/cito";
import {IComponentKeyStore} from "../ComponentKeyStore/IComponentKeyStore";
import {IRenderContext} from "../RenderContext/IRenderContext";
import {IRemitHandlers} from "../commons/IRemitHandlers";
import {IComponent} from "../Component/IComponent";
import {AttrChangedHandler} from "../commons/IAttrChanged";
import {IElement} from "../Element/IElement";

export interface IComponentAdministrator {
	component: IComponent;
	key: string;
	virtualNode?: IVirtualNode;
	keyStore: IComponentKeyStore;
	renderContext?: IRenderContext;
	remitHandlers?: IRemitHandlers;

	handleVirtualEvent(virtualEvent: IVirtualEvent);

	initAttrs(attrs: object);
	initRef(name: string, node: IElement, isComponent: boolean);
	initAttrChanged(name: string, handler: AttrChangedHandler<any>);

	callMount();
	callUpdate();
	callUnmount();

	destroyComponent();
}
