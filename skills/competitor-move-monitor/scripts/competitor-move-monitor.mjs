#!/usr/bin/env bun
// competitor-move-monitor — deterministic handoff packet builder.

export function run(input) {
  return {
    skill: 'competitor-move-monitor',
    writes_to: 'signals/competitor/',
    input,
    sections: ['move_summary', 'evidence', 'customer_impact', 'recommended_response'],
    requires_citations: true,
  };
}

if (import.meta.main) {
  const input = process.argv.slice(2).join(' ');
  console.log(JSON.stringify(run(input)));
}
