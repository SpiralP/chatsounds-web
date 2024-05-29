import { MenuItem } from "@blueprintjs/core";
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

  return <MenuItem onClick={handleClick} text={result} />;
}
