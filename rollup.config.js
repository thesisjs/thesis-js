import NodeResolve from "rollup-plugin-node-resolve";
import CommonJS from "rollup-plugin-commonjs";

const baseConfig = format => ({
	input: "lib/index.js",
	output: {
		file: `dist/index.${format}.js`,
		name: "Thesis",
		format,
	},
	plugins: [NodeResolve(), CommonJS({
		namedExports: {"./vendor/cito.js": ["vdom"]}
	})]
});

export default [
	"amd", "cjs", "esm",
].map(baseConfig);
