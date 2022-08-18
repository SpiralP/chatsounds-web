import { Callout, Intent, Spinner, SpinnerSize } from "@blueprintjs/core";
import React from "react";
import { useMount } from "react-use";
import WasmLoaded from "/components/WasmLoaded";
import useToaster from "/hooks/useToaster";
import { useWasmStateInfo, WasmContext, WasmState } from "/hooks/useWasm";

export default function WasmLoading() {
  const toaster = useToaster();
  useMount(() => {
    toaster.show({ message: "bap" });
  });
  const wasmStateInfo = useWasmStateInfo();

  switch (wasmStateInfo.state) {
    case WasmState.Loaded: {
      return (
        <WasmContext.Provider value={wasmStateInfo.wasm}>
          <WasmLoaded />
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
