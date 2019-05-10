
export function disposeModelLike(obj) {
	if (
		obj &&
		typeof obj === "object" &&
		typeof obj.dispose === "function"
	) {
		obj.dispose();
		return true;
	}

	return false;
}
