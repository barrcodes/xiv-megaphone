export function escapeDesktopExecArg(value: string) {
  return [...value]
    .map((character) => {
      switch (character) {
        case "\\":
          return String.raw`\\\\`;
        case '"':
        case "$":
        case "`":
          return String.raw`\\` + character;
        case "%":
          return "%%";
        case "\n":
          return String.raw`\n`;
        case "\t":
          return String.raw`\t`;
        case "\r":
          return String.raw`\r`;
        default:
          return character;
      }
    })
    .join("");
}

export function escapeDesktopString(value: string) {
  return [...value]
    .map((character) => {
      switch (character) {
        case "\\":
          return String.raw`\\`;
        case "\n":
          return String.raw`\n`;
        case "\t":
          return String.raw`\t`;
        case "\r":
          return String.raw`\r`;
        default:
          return character;
      }
    })
    .join("");
}
