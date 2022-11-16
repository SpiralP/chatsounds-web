import { Position, Toaster, ToasterInstance } from "@blueprintjs/core";
import React from "react";
import WasmLoading from "/components/WasmLoading";
import { ToasterContext } from "/hooks/useToaster";

export default function App() {
  const toasterRef = React.useRef<Toaster>(null);
  const [toaster, setToaster] = React.useState<ToasterInstance | null>(null);

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
      <Toaster ref={toasterRef} position={Position.BOTTOM_RIGHT} />
    </>
  );
}
