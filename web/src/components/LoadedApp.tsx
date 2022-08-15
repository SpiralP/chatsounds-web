import { Button, Spinner, SpinnerSize } from "@blueprintjs/core";
import canAutoplay from "can-autoplay";
import React from "react";
import { useMount } from "react-use";
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
      (e: any) => {
        // TODO
        console.error(e);
      }
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
