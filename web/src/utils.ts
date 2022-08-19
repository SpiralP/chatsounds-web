export function encodeComponent(input: string): string {
  return input.includes(":")
    ? input.replace(/ (?=.*:)/g, "-").replace(/ /g, "+")
    : input.replace(/ /g, "-");
}

export function decodeComponent(encoded: string): string {
  const bap = encoded.replace(/\+/g, " ");
  return bap.includes(":")
    ? bap.replace(/-(?=.*:)/g, " ")
    : bap.replace(/-/g, " ");
}
