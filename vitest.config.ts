import { defineConfig } from "vitest/config";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "client", "src"),
			"@shared": path.resolve(__dirname, "shared"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		root: path.resolve(__dirname),
		include: ["client/src/**/*.test.ts", "server/**/*.test.ts", "shared/**/*.test.ts"],
		exclude: ["node_modules"],
	},
});
