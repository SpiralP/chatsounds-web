import { Button } from "@blueprintjs/core";
import React from "react";
import ChatsoundsLoading from "/components/ChatsoundsLoading";
import useWasm from "/hooks/useWasm";

export default function LoadedApp() {
  const wasm = useWasm();

  const [loaded, setLoaded] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const click = React.useCallback(() => {
    setLoading(true);
    wasm.setup().then(
      () => {
        setLoading(false);
        setLoaded(true);
      },
      (e) => {
        // TODO
        console.error(e);
      }
    );
  }, [wasm]);

  if (loaded) {
    return (
      <div className="centered">
        <ChatsoundsLoading />
      </div>
    );
  }

  return (
    <div className="centered">
      <Button onClick={click} loading={loading} large>
        Click this thing!!
      </Button>
    </div>
  );
}
