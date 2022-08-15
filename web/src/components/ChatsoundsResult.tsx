import { MenuItem2 } from "@blueprintjs/popover2";
import React from "react";

export default function ChatsoundsResult({
  onClick,
  result,
}: {
  onClick: (result: string) => void;
  result: string;
}) {
  const handleClick = React.useCallback(() => {
    onClick(result);
  }, [onClick, result]);

  return <MenuItem2 onClick={handleClick} text={result} />;
}
