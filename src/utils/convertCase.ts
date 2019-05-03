
export function camelToDash(str: string): string {
	return str.replace(
		/([A-Z])/g,
		(_) => "-" + _[0].toLowerCase(),
	);
}

export function camelToDashInObject(obj: object): object {
	const result = {};

	// tslint:disable:forin
	for (const name in obj) {
		result[camelToDash(name)] = obj[name];
	}

	return result;
}
