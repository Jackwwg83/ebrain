#!/usr/bin/env bun
// capital-allocation-advisor — deterministic handoff packet builder.

export function run(input) {
  return {
    skill: 'capital-allocation-advisor',
    writes_to: 'analysis/capital-allocation/',
    input,
    sections: ['budget_pressure', 'expected_return', 'risk_adjustment', 'decision_options'],
    requires_citations: true,
  };
}

if (import.meta.main) {
  const input = process.argv.slice(2).join(' ');
  console.log(JSON.stringify(run(input)));
}
