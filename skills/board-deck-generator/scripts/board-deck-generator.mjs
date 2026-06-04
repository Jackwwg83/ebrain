#!/usr/bin/env bun
// board-deck-generator — deterministic handoff packet builder.

export function run(input) {
  return {
    skill: 'board-deck-generator',
    writes_to: 'briefs/board/',
    input,
    sections: ['business_update', 'risk_posture', 'capital_allocation', 'open_decisions'],
    requires_citations: true,
  };
}

if (import.meta.main) {
  const input = process.argv.slice(2).join(' ');
  console.log(JSON.stringify(run(input)));
}
