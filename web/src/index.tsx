import { FocusStyleManager } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "normalize.css/normalize.css";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "/src/components/App";
import "/src/styles/index.css";

function main() {
  FocusStyleManager.onlyShowFocusOnTabs();

  const root = document.getElementById("root");
  if (!root) {
    throw new Error("!root");
  }
  createRoot(root).render(<App />);
}

main();
