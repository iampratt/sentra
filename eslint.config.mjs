import nextPlugin from "eslint-config-next";

const config = [
  ...nextPlugin,
  {
    ignores: [".next/**", "node_modules/**", "dist/**", "build/**"],
  },
];

export default config;
