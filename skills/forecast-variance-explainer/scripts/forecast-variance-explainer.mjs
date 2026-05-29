#!/usr/bin/env bun
// forecast-variance-explainer — deterministic handoff packet builder.

export function run(input) {
  return {
    skill: 'forecast-variance-explainer',
    writes_to: 'signals/forecast/',
    input,
    sections: ['variance_summary', 'driver_evidence', 'confidence', 'next_measurement'],
    requires_citations: true,
  };
}

if (import.meta.main) {
  const input = process.argv.slice(2).join(' ');
  console.log(JSON.stringify(run(input)));
}
