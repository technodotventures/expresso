export class MemoryJournal {
  constructor(entries = []) {
    this.entries = structuredClone(entries);
  }

  append(entry) {
    const frozen = structuredClone({
      sequence: this.entries.length + 1,
      recordedAt: new Date().toISOString(),
      ...entry,
    });
    this.entries.push(frozen);
    return structuredClone(frozen);
  }

  find(type, structuralIdentity) {
    const found = this.entries.findLast((entry) => (
      entry.type === type && entry.structuralIdentity === structuralIdentity
    ));
    return found ? structuredClone(found) : null;
  }

  snapshot() {
    return structuredClone(this.entries);
  }
}
