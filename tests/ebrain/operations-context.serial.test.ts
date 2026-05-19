import { afterEach, describe, expect, test } from 'bun:test';
import type { BrainEngine } from '../../src/core/engine.ts';
import type { AuthInfo, Operation, OperationContext } from '../../src/core/operations.ts';
import { operations } from '../../src/core/operations.ts';
import { dispatchToolCall } from '../../src/mcp/dispatch.ts';
import type { ExecutiveProfile } from '../../src/ebrain/types.ts';
import {
  _setLoadExecutiveProfileForTest,
  loadExecutiveProfile,
} from '../../src/ebrain/executives/load-profile.ts';

const TEST_OP_PREFIX = 'ebrain_a4_test_';

function logger(): OperationContext['logger'] {
  return { info() {}, warn() {}, error() {} };
}

function profile(executiveId = 'exec-1'): ExecutiveProfile {
  return {
    executiveId,
    email: `${executiveId}@example.test`,
    displayName: 'Test Executive',
    role: 'CEO',
    soulPath: `executives/${executiveId}/SOUL.md`,
    agentPersonaPath: `executives/${executiveId}/AGENT_PERSONA.md`,
    userPath: `executives/${executiveId}/USER.md`,
    preferencesPath: `executives/${executiveId}/preferences.yml`,
    personalSkillsRoot: `executives/${executiveId}/personal-skills`,
    subagentName: 'ceo-agent',
    pushPreferences: {},
  };
}

function addOperation(op: Operation): void {
  operations.push(op);
}

afterEach(() => {
  _setLoadExecutiveProfileForTest(null);
  for (let i = operations.length - 1; i >= 0; i -= 1) {
    if (operations[i]?.name.startsWith(TEST_OP_PREFIX)) operations.splice(i, 1);
  }
});

describe('Ebrain OperationContext extensions', () => {
  test('OperationContext accepts executive and v2 policy fields', () => {
    const ctx: OperationContext = {
      engine: {} as BrainEngine,
      config: { engine: 'postgres' },
      logger: logger(),
      dryRun: false,
      remote: true,
      sourceId: 'default',
      executive: profile(),
      orgId: 'org-1',
      buId: 'bu-1',
      workspaceId: 'workspace-1',
      userAttrs: {
        roles: ['admin'],
        departments: ['finance'],
        employmentLevel: 'L8',
        employmentStatus: 'active',
        employeeId: 'E001',
      },
      dataClassificationMax: 'L3',
      policyDecision: { decision: 'allow', reason: 'test' },
    };

    expect(ctx.executive?.executiveId).toBe('exec-1');
    expect(ctx.remote).toBe(true);
    expect(ctx.policyDecision?.decision).toBe('allow');
  });

  test('AuthInfo accepts executive identity fields', () => {
    const auth: AuthInfo = {
      token: 'token',
      clientId: 'client',
      scopes: ['read'],
      executiveId: 'exec-1',
      executiveEmail: 'exec-1@example.test',
      executiveRole: 'CEO',
    };

    expect(auth.executiveId).toBe('exec-1');
    expect(auth.sourceId).toBeUndefined();
  });

  test('dispatchToolCall attaches executive profile when auth.executiveId is set', async () => {
    let observedCtx: OperationContext | null = null;
    let loadCount = 0;
    _setLoadExecutiveProfileForTest(async (_engine, executiveId) => {
      loadCount += 1;
      return profile(executiveId);
    });
    addOperation({
      name: `${TEST_OP_PREFIX}with_executive`,
      description: 'A4 test op',
      params: {},
      handler: async (ctx) => {
        observedCtx = ctx;
        return { executiveId: ctx.executive?.executiveId ?? null };
      },
      mutating: false,
    });

    const result = await dispatchToolCall(
      {} as BrainEngine,
      `${TEST_OP_PREFIX}with_executive`,
      {},
      {
        auth: {
          token: 'token',
          clientId: 'client',
          scopes: ['read'],
          executiveId: 'exec-42',
        },
      },
    );

    expect(result.isError).toBeUndefined();
    expect(loadCount).toBe(1);
    expect(observedCtx?.executive?.executiveId).toBe('exec-42');
  });

  test('dispatchToolCall leaves executive unset when auth.executiveId is missing', async () => {
    let observedCtx: OperationContext | null = null;
    let loadCount = 0;
    _setLoadExecutiveProfileForTest(async () => {
      loadCount += 1;
      return profile();
    });
    addOperation({
      name: `${TEST_OP_PREFIX}without_executive`,
      description: 'A4 test op',
      params: {},
      handler: async (ctx) => {
        observedCtx = ctx;
        return { executiveId: ctx.executive?.executiveId ?? null };
      },
      mutating: false,
    });

    const result = await dispatchToolCall(
      {} as BrainEngine,
      `${TEST_OP_PREFIX}without_executive`,
      {},
      { auth: { token: 'token', clientId: 'client', scopes: ['read'] } },
    );

    expect(result.isError).toBeUndefined();
    expect(loadCount).toBe(0);
    expect(observedCtx?.executive).toBeUndefined();
  });

  test('dispatchToolCall wraps loadExecutiveProfile errors as JSON ToolResult', async () => {
    _setLoadExecutiveProfileForTest(async () => {
      throw new Error('loader boom');
    });
    addOperation({
      name: `${TEST_OP_PREFIX}loader_error`,
      description: 'A4 loader error test op',
      params: {},
      handler: async () => ({ ok: true }),
      mutating: false,
    });

    const result = await dispatchToolCall(
      {} as BrainEngine,
      `${TEST_OP_PREFIX}loader_error`,
      {},
      {
        auth: {
          token: 'token',
          clientId: 'client',
          scopes: ['read'],
          executiveId: 'exec-err',
        },
      },
    );

    expect(result.isError).toBe(true);
    expect(result.content[0]?.type).toBe('text');
    const body = JSON.parse(result.content[0]?.text ?? '{}');
    expect(body).toEqual({ error: 'internal_error', message: 'loader boom' });
  });

  test('loadExecutiveProfile stub returns null in A4 MVP runtime', async () => {
    await expect(loadExecutiveProfile({} as BrainEngine, 'exec-1')).resolves.toBeNull();
  });
});
