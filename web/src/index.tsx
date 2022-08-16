import { FocusStyleManager } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "@blueprintjs/popover2/lib/css/blueprint-popover2.css";
import "normalize.css/normalize.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "/components/App";
import { createToaster, ToasterContext } from "/hooks/useToaster";
import "/styles/index.css";

function main() {
  FocusStyleManager.onlyShowFocusOnTabs();

  const root = document.getElementById("root");
  if (!root) {
    throw new Error("!root");
  }

  const toaster = createToaster();

  ReactDOM.createRoot(root).render(
    <ToasterContext.Provider value={toaster}>
      <App />
    </ToasterContext.Provider>
  );
}

main();
