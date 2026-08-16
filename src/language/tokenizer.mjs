import { diagnostic } from "../core/diagnostics.mjs";

const SINGLE = new Set(["{", "}", "(", ")", ":", ",", "."]);
const OPERATOR_START = new Set(["=", "!", "<", ">"]);

function location(line, column, offset) {
  return { line, column, offset };
}

export function tokenize(source) {
  const tokens = [];
  const diagnostics = [];
  let offset = 0;
  let line = 1;
  let column = 1;

  function advance() {
    const char = source[offset++];
    if (char === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    return char;
  }

  function add(type, value, start) {
    tokens.push({ type, value, location: start });
  }

  while (offset < source.length) {
    const char = source[offset];

    if (/\s/.test(char)) {
      advance();
      continue;
    }

    if (char === "/" && source[offset + 1] === "/") {
      while (offset < source.length && source[offset] !== "\n") advance();
      continue;
    }

    if (char === "#") {
      while (offset < source.length && source[offset] !== "\n") advance();
      continue;
    }

    const start = location(line, column, offset);

    if (char === '"') {
      advance();
      let value = "";
      let terminated = false;
      while (offset < source.length) {
        const current = advance();
        if (current === '"') {
          terminated = true;
          break;
        }
        if (current === "\\") {
          const escaped = advance();
          const escapes = { n: "\n", r: "\r", t: "\t", '"': '"', "\\": "\\" };
          value += escapes[escaped] ?? escaped;
        } else {
          value += current;
        }
      }
      if (!terminated) {
        diagnostics.push(diagnostic({
          code: "P001",
          message: "Unterminated string literal.",
          location: start,
        }));
      } else {
        add("string", value, start);
      }
      continue;
    }

    if (/[0-9]/.test(char)) {
      let value = "";
      while (offset < source.length && /[0-9]/.test(source[offset])) {
        value += advance();
      }
      add("number", Number(value), start);
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      let value = "";
      while (
        offset < source.length
        && /[A-Za-z0-9_-]/.test(source[offset])
      ) {
        value += advance();
      }
      add("identifier", value, start);
      continue;
    }

    if (SINGLE.has(char)) {
      add("punctuation", advance(), start);
      continue;
    }

    if (OPERATOR_START.has(char)) {
      let value = advance();
      if (source[offset] === "=") value += advance();
      if (value === "!") {
        diagnostics.push(diagnostic({
          code: "P002",
          message: `Unsupported operator '${value}'.`,
          location: start,
          repair: "Use ==, !=, <, <=, >, or >= in deterministic requirements.",
        }));
      } else add(value === "=" ? "punctuation" : "operator", value, start);
      continue;
    }

    diagnostics.push(diagnostic({
      code: "P003",
      message: `Unexpected character '${char}'.`,
      location: start,
    }));
    advance();
  }

  tokens.push({
    type: "eof",
    value: "<eof>",
    location: location(line, column, offset),
  });
  return { tokens, diagnostics };
}
