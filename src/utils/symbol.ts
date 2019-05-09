
export function installSymbolPolyfill() {
	if (!(window as any).Symbol) {
		(window as any).Symbol = function SymbolPolyfill(key) {
			return `$$${key}`;
		};
	}
}

export function isSymbol(name): boolean {
	if (typeof name === "string") {
		return name.startsWith("$$");
	}

	return typeof name === "symbol";
}
