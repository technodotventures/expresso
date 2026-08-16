import { diagnostic, resultFromDiagnostics } from "../core/diagnostics.mjs";
import { tokenize } from "./tokenizer.mjs";

class ParseFailure extends Error {
  constructor(item) {
    super(item.message);
    this.diagnostic = item;
  }
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.index = 0;
  }

  current() {
    return this.tokens[this.index];
  }

  at(value) {
    return this.current().value === value;
  }

  consume(value, message) {
    const token = this.current();
    if (value !== undefined && token.value !== value) {
      throw new ParseFailure(diagnostic({
        code: "P100",
        message: message ?? `Expected '${value}', found '${token.value}'.`,
        location: token.location,
      }));
    }
    this.index += 1;
    return token;
  }

  identifier(message = "Expected an identifier.") {
    const token = this.current();
    if (token.type !== "identifier") {
      throw new ParseFailure(diagnostic({
        code: "P101",
        message,
        location: token.location,
      }));
    }
    this.index += 1;
    return token;
  }

  parseProgram() {
    const start = this.consume("workflow", "A file must start with 'workflow'.");
    const name = this.identifier("Expected a workflow name.");
    this.consume("{");

    let input = null;
    let grants = null;
    const statements = [];

    while (!this.at("}") && !this.at("<eof>")) {
      if (this.at("input")) {
        if (input) this.fail("P102", "A workflow may declare input only once.");
        input = this.parseSchemaBlock();
      } else if (this.at("grants")) {
        if (grants) this.fail("P103", "A workflow may declare grants only once.");
        grants = this.parseGrants();
      } else {
        statements.push(this.parseStatement());
      }
    }

    this.consume("}", "Expected '}' to close the workflow.");
    this.consume("<eof>", "Only one workflow is allowed per file.");

    return {
      type: "Workflow",
      name: name.value,
      input: input ?? { type: "Schema", fields: {}, location: start.location },
      grants: grants ?? [],
      statements,
      location: start.location,
    };
  }

  parseSchemaBlock() {
    const start = this.consume("input");
    this.consume("{");
    const fields = {};
    while (!this.at("}")) {
      const name = this.identifier("Expected an input field name.");
      this.consume(":");
      const fieldType = this.identifier("Expected an input field type.");
      fields[name.value] = { type: fieldType.value, location: name.location };
      if (this.at(",")) this.consume(",");
    }
    this.consume("}");
    return { type: "Schema", fields, location: start.location };
  }

  parseGrants() {
    this.consume("grants");
    this.consume("{");
    const grants = [];
    while (!this.at("}")) {
      grants.push(this.parsePathName());
      if (this.at(",")) this.consume(",");
    }
    this.consume("}");
    return grants;
  }

  parseStatement() {
    if (this.at("let")) return this.parseLet();
    if (this.at("action")) return this.parseAction();
    this.fail(
      "P104",
      `Unsupported statement '${this.current().value}'.`,
      "Use let ... = observe, let ... = validate, or action.",
    );
  }

  parseLet() {
    const start = this.consume("let");
    const binding = this.identifier("Expected a binding name after 'let'.");
    this.consume("=");
    if (this.at("observe")) return this.parseObserve(binding, start.location);
    if (this.at("validate")) return this.parseValidate(binding, start.location);
    this.fail(
      "P105",
      "A let binding must introduce an observation or validation.",
    );
  }

  parseObserve(binding, location) {
    this.consume("observe");
    const label = this.consumeString("An observation needs a stable string label.");
    const operation = this.parsePathName();
    const input = this.parseRecord();
    return {
      type: "Observe",
      binding: binding.value,
      label: label.value,
      operation,
      input,
      location,
    };
  }

  parseValidate(binding, location) {
    this.consume("validate");
    const source = this.identifier("Expected the observed value to validate.");
    this.consume("{");
    const requirements = [];
    while (this.at("require")) {
      this.consume("require");
      requirements.push(this.parseExpression());
    }
    this.consume("return", "A validate block must return a value.");
    const value = this.parseExpression();
    this.consume("}");
    return {
      type: "Validate",
      binding: binding.value,
      source: source.value,
      requirements,
      value,
      location,
    };
  }

  parseAction() {
    const start = this.consume("action");
    const label = this.consumeString("An action needs a stable string label.");
    const operation = this.parsePathName();
    this.consume("{");
    let identity = null;
    let recovery = null;
    let input = null;

    while (!this.at("}")) {
      if (this.at("identity")) {
        this.consume("identity");
        identity = this.parseExpression();
      } else if (this.at("recovery")) {
        this.consume("recovery");
        recovery = this.identifier("Expected a recovery mode.").value;
      } else if (this.at("input")) {
        this.consume("input");
        input = this.parseRecord();
      } else {
        this.fail(
          "P106",
          `Unknown action property '${this.current().value}'.`,
          "Actions support identity, recovery, and input.",
        );
      }
    }
    this.consume("}");
    return {
      type: "Action",
      label: label.value,
      operation,
      identity,
      recovery,
      input,
      location: start.location,
    };
  }

  parseExpression() {
    let left = this.parsePrimary();
    if (
      this.current().type === "operator"
      && ["==", "!=", "<", "<=", ">", ">="].includes(this.current().value)
    ) {
      const operator = this.consume().value;
      const right = this.parsePrimary();
      left = {
        type: "BinaryExpression",
        operator,
        left,
        right,
        location: left.location,
      };
    }
    return left;
  }

  parsePrimary() {
    const token = this.current();
    if (token.type === "string") {
      this.consume();
      return { type: "Literal", value: token.value, location: token.location };
    }
    if (token.type === "number") {
      this.consume();
      return { type: "Literal", value: token.value, location: token.location };
    }
    if (token.value === "true" || token.value === "false") {
      this.consume();
      return {
        type: "Literal",
        value: token.value === "true",
        location: token.location,
      };
    }
    if (token.value === "{") return this.parseRecord();
    if (token.type === "identifier") {
      const path = this.parsePathParts();
      return {
        type: "Reference",
        path,
        location: token.location,
      };
    }
    this.fail("P107", `Expected an expression, found '${token.value}'.`);
  }

  parseRecord() {
    const start = this.consume("{");
    const fields = {};
    while (!this.at("}")) {
      const name = this.identifier("Expected a record field name.");
      this.consume(":");
      fields[name.value] = this.parseExpression();
      if (this.at(",")) this.consume(",");
    }
    this.consume("}");
    return { type: "RecordExpression", fields, location: start.location };
  }

  parsePathParts() {
    const parts = [this.identifier().value];
    while (this.at(".")) {
      this.consume(".");
      parts.push(this.identifier("Expected a name after '.'.").value);
    }
    return parts;
  }

  parsePathName() {
    return this.parsePathParts().join(".");
  }

  consumeString(message) {
    const token = this.current();
    if (token.type !== "string") {
      throw new ParseFailure(diagnostic({
        code: "P108",
        message,
        location: token.location,
      }));
    }
    this.index += 1;
    return token;
  }

  fail(code, message, repair) {
    throw new ParseFailure(diagnostic({
      code,
      message,
      repair,
      location: this.current().location,
    }));
  }
}

export function parse(source) {
  const tokenized = tokenize(source);
  if (tokenized.diagnostics.length > 0) {
    return resultFromDiagnostics(tokenized.diagnostics, { ast: null });
  }
  try {
    const ast = new Parser(tokenized.tokens).parseProgram();
    return resultFromDiagnostics([], { ast });
  } catch (error) {
    if (error instanceof ParseFailure) {
      return resultFromDiagnostics([error.diagnostic], { ast: null });
    }
    throw error;
  }
}
