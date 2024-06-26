import { Button, Spinner, SpinnerSize } from "@blueprintjs/core";
import canAutoplay from "can-autoplay";
import React from "react";
import { useMount } from "react-use";
import ChatsoundsLoading from "/src/components/ChatsoundsLoading";
import useWasm from "/src/hooks/useWasm";

export default function WasmLoaded() {
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
      (e: Error) => {
        // TODO
        console.error(e);
      },
    );
  }, [wasm]);

  const [showButton, setShowButton] = React.useState(false);

  useMount(async () => {
    const { result } = await canAutoplay.audio();
    if (result) {
      click();
    } else {
      setShowButton(true);
    }
  });

  if (loaded) {
    return <ChatsoundsLoading />;
  }

  return (
    <div className="centered">
      {showButton ? (
        <Button autoFocus onClick={click} loading={loading} large>
          Click this thing!!
        </Button>
      ) : (
        <Spinner size={SpinnerSize.LARGE} />
      )}
    </div>
  );
}
