
export function installSymbolPolyfill() {
	(window as any).Symbol = function SymbolPolyfill(key) {
		return `$$${key}`;
	};
}

export function symbol(name): symbol {
	/* istanbul ignore next */
	if (!(window as any).Symbol) {
		installSymbolPolyfill();
		return Symbol(name);
	}

	return Symbol(name);
}

export function isSymbol(name): boolean {
	if (typeof name === "string") {
		return name.startsWith("$$");
	}

	return typeof name === "symbol";
}
