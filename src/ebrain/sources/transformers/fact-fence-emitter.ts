import {
  FACTS_FENCE_BEGIN,
  FACTS_FENCE_END,
  parseFactsFence,
  renderFactsTable,
} from '../../../core/facts-fence.ts';
import type { ParsedFact } from '../../../core/facts-fence.ts';

export { FACTS_FENCE_BEGIN, FACTS_FENCE_END, parseFactsFence };

export function emitFactFence(facts: ParsedFact[]): string {
  return renderFactsTable(facts);
}
