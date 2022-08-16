import { FocusStyleManager } from "@blueprintjs/core";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "/components/App";
import { createToaster, ToasterContext } from "/hooks/useToaster";
import "/styles/index.css";

function main() {
  FocusStyleManager.onlyShowFocusOnTabs();

  const root = document.createElement("div");
  document.body.appendChild(root);

  const toaster = createToaster();

  ReactDOM.createRoot(root).render(
    <ToasterContext.Provider value={toaster}>
      <App />
    </ToasterContext.Provider>
  );
}

main();
