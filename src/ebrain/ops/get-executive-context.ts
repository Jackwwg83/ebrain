import type { Operation } from '../../core/operations.ts';
import { GET_EXECUTIVE_CONTEXT_DESCRIPTION } from '../../core/operations-descriptions.ts';
import { loadExecutiveProfile } from '../executives/load-profile.ts';
import { loadExecutivePrompt } from '../executives/load-prompt.ts';
import { sanitizeExecutiveProfile } from './list-executives.ts';

async function operationError(code: string, message: string): Promise<never> {
  const { OperationError } = await import('../../core/operations.ts');
  throw new OperationError(code, message);
}

export const get_executive_context: Operation = {
  name: 'get_executive_context',
  description: GET_EXECUTIVE_CONTEXT_DESCRIPTION,
  scope: 'read',
  localOnly: false,
  mutating: false,
  params: {
    executive_id: {
      type: 'string',
      required: true,
      description: 'Executive id to load from the executives table.',
    },
  },
  handler: async (ctx, p) => {
    const executiveId = typeof p.executive_id === 'string' ? p.executive_id.trim() : '';
    if (!executiveId) {
      await operationError('invalid_params', 'executive_id is required');
    }

    const profile = await loadExecutiveProfile(ctx.engine, executiveId);
    if (!profile) {
      return await operationError('not_found', `executive_id ${executiveId} not found`);
    }

    const prompt = await loadExecutivePrompt(profile);
    return {
      profile: sanitizeExecutiveProfile(profile),
      prompt,
    };
  },
};
