export function diagnostic({
  code,
  message,
  severity = "error",
  location,
  repair,
  details,
}) {
  return {
    code,
    severity,
    message,
    ...(location ? { location } : {}),
    ...(repair ? { repair } : {}),
    ...(details ? { details } : {}),
  };
}

export function summarizeDiagnostics(diagnostics) {
  const summary = { errors: 0, blockers: 0, warnings: 0, info: 0 };
  for (const item of diagnostics) {
    const key = item.severity === "error"
      ? "errors"
      : item.severity === "blocker"
        ? "blockers"
        : item.severity === "warning"
          ? "warnings"
          : "info";
    summary[key] += 1;
  }
  return summary;
}

export function resultFromDiagnostics(diagnostics, extra = {}) {
  const summary = summarizeDiagnostics(diagnostics);
  return {
    ok: summary.errors === 0,
    executable: summary.errors === 0 && summary.blockers === 0,
    diagnostics,
    summary,
    ...extra,
  };
}

export function formatDiagnostic(item, file = "<source>") {
  const where = item.location
    ? `${file}:${item.location.line}:${item.location.column}`
    : file;
  const repair = item.repair ? `\n  repair: ${item.repair}` : "";
  return `${where} ${item.severity.toUpperCase()} ${item.code}: ${item.message}${repair}`;
}
