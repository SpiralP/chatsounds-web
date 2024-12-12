import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": "ts-jest",
  },
};

export default config;
