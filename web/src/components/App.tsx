import { Callout, Intent, Spinner, SpinnerSize } from "@blueprintjs/core";
import React from "react";
import LoadedApp from "/components/LoadedApp";
import { useWasmStateInfo, WasmContext, WasmState } from "/hooks/useWasm";

export default function App() {
  const wasmStateInfo = useWasmStateInfo();

  switch (wasmStateInfo.state) {
    case WasmState.Loaded: {
      return (
        <WasmContext.Provider value={wasmStateInfo.wasm}>
          <LoadedApp />
        </WasmContext.Provider>
      );
    }

    case WasmState.Loading: {
      return (
        <div className="centered">
          <Spinner size={SpinnerSize.LARGE} />
        </div>
      );
    }

    case WasmState.Error: {
      return <Callout intent={Intent.DANGER} title={wasmStateInfo.error} />;
    }

    default: {
      throw new Error("unreachable");
    }
  }
}
