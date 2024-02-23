// Position is a type that indicates the position of a node in the source code.
// This is used in the AST of unified-latex.
export type Position = {
  start: {
    line: number;
    column: number;
    offset: number;
  };
  end: {
    line: number;
    column: number;
    offset: number;
  };
};
