// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");

module.exports = {
  root: true,
  ignorePatterns: ["*.js"],
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",

    "airbnb",
    "airbnb-typescript",

    "plugin:react/recommended",
    "plugin:react-hooks/recommended",

    "prettier",

    "plugin:@blueprintjs/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: path.join(__dirname, "tsconfig.json"),
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["react", "@typescript-eslint", "@blueprintjs"],
  rules: {
    "@typescript-eslint/no-shadow": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "import/extensions": "off",
    "import/no-absolute-path": "off",
    "jsx-a11y/media-has-caption": "off",
    "no-console": "off",
    "jsx-a11y/no-static-element-interactions": "off",
    "import/no-extraneous-dependencies": "off",
    "@typescript-eslint/no-inferrable-types": "off",
  },
};
