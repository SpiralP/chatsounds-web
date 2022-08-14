import { InputGroup } from "@blueprintjs/core";
import React from "react";
import ChatsoundsSearchResults from "/components/ChatsoundsSearchResults";
import useWasm from "/hooks/useWasm";

export default function Chatsounds() {
  const { play } = useWasm();

  const [input, setInput] = React.useState("");

  const inputChange = React.useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setInput(value);
    },
    []
  );

  const inputKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        play(input);
      } else if (event.key === "Tab") {
        event.preventDefault();
      }
    },
    [input, play]
  );

  return (
    <>
      <InputGroup
        large
        autoFocus
        onChange={inputChange}
        onKeyDown={inputKeyDown}
      />
      <ChatsoundsSearchResults input={input} />
    </>
  );
}
