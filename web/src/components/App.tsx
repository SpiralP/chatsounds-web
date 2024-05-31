import { OverlayToaster, Position, Toaster } from "@blueprintjs/core";
import React from "react";
import WasmLoading from "/src/components/WasmLoading";
import { ToasterContext } from "/src/hooks/useToaster";

export default function App() {
  const toasterRef = React.useRef<OverlayToaster>(null);
  const [toaster, setToaster] = React.useState<Toaster | null>(null);

  React.useEffect(() => {
    setToaster(toasterRef.current);
  }, []);

  return (
    <>
      {toaster ? (
        <ToasterContext.Provider value={toaster}>
          <WasmLoading />
        </ToasterContext.Provider>
      ) : null}
      <OverlayToaster ref={toasterRef} position={Position.BOTTOM_RIGHT} />
    </>
  );
}
