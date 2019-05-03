
function makeSymbol(name): symbol {
	/* istanbul ignore else */
	if ((window as any).Symbol !== void 0) {
		return Symbol(name);
	}

	/* istanbul ignore next */
	return (`$$${name}` as any) as symbol;
}

export const ATTRS_KEY = makeSymbol("attrs");
export const ADMINISTRATOR_KEY = makeSymbol("administrator");
export const VIEWS_KEY = makeSymbol("views");
export const OBSERVER_ID_KEY = makeSymbol("observerId");
export const REACTION_KEY = makeSymbol("reaction");
export const DISPOSED_KEY = makeSymbol("disposed");
