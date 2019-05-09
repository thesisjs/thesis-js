
export function makeSymbol(name): symbol {
	/* istanbul ignore else */
	if ((window as any).Symbol !== void 0) {
		return Symbol(name);
	}

	/* istanbul ignore next */
	return (`$$${name}` as any) as symbol;
}
