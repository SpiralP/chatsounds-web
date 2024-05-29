import { OverlayToaster, Position, Toaster } from "@blueprintjs/core";
import React from "react";

export function createToaster() {
  return OverlayToaster.create({ position: Position.BOTTOM_RIGHT });
}

export const ToasterContext = React.createContext<Toaster | null>(null);

export default function useToaster() {
  const toaster = React.useContext(ToasterContext);
  if (!toaster) {
    throw new Error("!toaster");
  }
  return toaster;
}
