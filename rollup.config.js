import { terser } from "rollup-plugin-terser";
import typescript from "rollup-plugin-typescript2";
import replace from "@rollup/plugin-replace";

export default {
  input: "src/index.ts",
  plugins: [terser(), typescript()],
  output: [
    {
      file: "dist/orbiter-bridge-SDK.cjs.js",
      format: "cjs",
    },
    {
      file: "dist/esm/orbiter-bridge-SDK.esm.js",
      format: "esm",
      plugins: [
        {
          generateBundle() {
            this.emitFile({
              fileName: "package.json",
              source: `{ "type": "module" }\n`,
              type: "asset",
            });
          },
          name: "emit-module-package-file",
        },
      ],
    },
    {
      file: "dist/orbiter-bridge-SDK.js",
      format: "umd",
      name: "orbiter-bridge-sdk",
    },
    // Universal module definition (UMD) build (production)
    {
      file: "dist/orbiter-bridge-SDK.js",
      format: "umd",
      name: "orbiter-bridge-sdk",
      plugins: [
        // Setting production env before running other steps
        replace({
          "process.env.NODE_ENV": JSON.stringify("production"),
          preventAssignment: true,
        }),
      ],
    },
  ],
};
