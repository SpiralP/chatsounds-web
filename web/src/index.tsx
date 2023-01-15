import { FocusStyleManager } from "@blueprintjs/core";
import React from "react";
import ReactDOM from "react-dom";
import App from "/components/App";
import "/styles/index.css";

function main() {
  FocusStyleManager.onlyShowFocusOnTabs();

  const root = document.createElement("div");
  document.body.appendChild(root);

  ReactDOM.render(<App />, root);
}

main();
