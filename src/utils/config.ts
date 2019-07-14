import {assert} from "./assert";

export const MODE_PRODUCTION = "production";
export const MODE_DEVELOPMENT = "development";

export type Mode = typeof MODE_PRODUCTION | typeof MODE_DEVELOPMENT;

export interface IConfig {
	mode?: Mode;
}

export class Config {
	private modeValue: Mode = MODE_PRODUCTION;

	public get mode(): Mode {
		return this.modeValue;
	}

	public set(fields: IConfig) {
		Object.keys(fields).forEach((key) => {
			const value = fields[key];

			switch (key) {
				case "mode": {
					assert(
						value === MODE_PRODUCTION ||
						value === MODE_DEVELOPMENT,
						`Mode should me either "${MODE_PRODUCTION}" or "${MODE_DEVELOPMENT}".`,
					);
					break;
				}

				default: {
					assert(false, `Invalid configuration field: "${key}"`);
					return;
				}
			}

			this[`${value}Value`] = value;
		});
	}
}

export const rootConfig = new Config();
