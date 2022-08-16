import { IToaster, Position, Toaster } from "@blueprintjs/core";
import React from "react";

export function createToaster() {
  return Toaster.create({ position: Position.BOTTOM_RIGHT });
}

export const ToasterContext = React.createContext<IToaster | null>(null);

export default function useToaster() {
  const toaster = React.useContext(ToasterContext);
  if (!toaster) {
    throw new Error("!toaster");
  }
  return toaster;
}
