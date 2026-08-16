export function evaluate(expression, environment) {
  if (!expression) return undefined;
  switch (expression.type) {
    case "Literal":
      return expression.value;
    case "Reference":
      return readPath(environment, expression.path);
    case "RecordExpression":
      return Object.fromEntries(
        Object.entries(expression.fields).map(([key, value]) => [
          key,
          evaluate(value, environment),
        ]),
      );
    case "BinaryExpression":
      return compare(
        expression.operator,
        evaluate(expression.left, environment),
        evaluate(expression.right, environment),
      );
    default:
      throw new Error(`Unsupported expression node '${expression.type}'.`);
  }
}

function readPath(environment, path) {
  let current = environment[path[0]];
  if (current === undefined) {
    throw new Error(`Unknown runtime value '${path[0]}'.`);
  }
  for (const part of path.slice(1)) {
    if (current === null || current === undefined || !(part in current)) {
      throw new Error(`Cannot read '${path.join(".")}'.`);
    }
    current = current[part];
  }
  return current;
}

function compare(operator, left, right) {
  switch (operator) {
    case "==": return left === right;
    case "!=": return left !== right;
    case "<": return left < right;
    case "<=": return left <= right;
    case ">": return left > right;
    case ">=": return left >= right;
    default: throw new Error(`Unsupported operator '${operator}'.`);
  }
}
