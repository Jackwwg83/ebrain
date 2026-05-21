import type { BrainEngine } from '../../core/engine.ts';
import type { OperationContext } from '../../core/operations.ts';
import type { PushResult } from '../bot/push-orchestrator.ts';
import type { ExecutiveProfile } from '../types.ts';
import { pushMorningBrief } from '../bot/push-orchestrator.ts';
import { loadExecutiveProfile } from '../executives/load-profile.ts';
import { generateExecutiveBriefStub } from './generate-brief-stub.ts';

export const EXECUTIVE_BRIEF_JOB = 'ebrain-executive-brief';
export const DEFAULT_EXECUTIVE_TIMEZONE = 'Asia/Shanghai';
const DEFAULT_MORNING_BRIEF_TIME = '08:00';
const SCHEDULE_TOLERANCE_MINUTES = 5;
const PUSH_ATTEMPTS = 3;

export interface RunExecutiveBriefOpts {
  executiveId: string;
  dateUtc?: Date;
}

export interface ExecutiveBriefResult {
  briefPath?: string;
  briefSlug?: string;
  pushed: boolean;
  skipped?: string;
  nextEligibleAt?: string;
  pushResult?: PushResult;
}

interface LocalDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

interface QuietWindow {
  start: number;
  end: number;
  raw: string;
}

interface ScheduledMorningBriefTime {
  minute: number;
  raw: string;
}

type PushMorningBriefFn = typeof pushMorningBrief;
type GenerateBriefFn = typeof generateExecutiveBriefStub;

interface ExecutiveBriefDeps {
  pushMorningBrief?: PushMorningBriefFn;
  generateBrief?: GenerateBriefFn;
}

let depsForTest: ExecutiveBriefDeps | null = null;

export function _setExecutiveBriefDepsForTest(deps: ExecutiveBriefDeps | null): void {
  depsForTest = deps;
}

function deps(): Required<ExecutiveBriefDeps> {
  return {
    pushMorningBrief: depsForTest?.pushMorningBrief ?? pushMorningBrief,
    generateBrief: depsForTest?.generateBrief ?? generateExecutiveBriefStub,
  };
}

function normalizeDateUtc(dateUtc?: Date): Date {
  if (!dateUtc) return new Date();
  if (Number.isNaN(dateUtc.getTime())) throw new Error('dateUtc must be a valid Date');
  return dateUtc;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function safeTimezone(timezone: string | undefined, logger: OperationContext['logger']): string {
  const candidate = timezone || DEFAULT_EXECUTIVE_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: candidate }).format(new Date(0));
    return candidate;
  } catch {
    logger.warn(`[executive-brief] invalid timezone '${candidate}', falling back to UTC`);
    return 'UTC';
  }
}

function getLocalParts(dateUtc: Date, timezone: string): LocalDateTimeParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(dateUtc);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(byType.get('year')),
    month: Number(byType.get('month')),
    day: Number(byType.get('day')),
    hour: Number(byType.get('hour')) % 24,
    minute: Number(byType.get('minute')),
  };
}

function minuteOfDay(parts: Pick<LocalDateTimeParts, 'hour' | 'minute'>): number {
  return parts.hour * 60 + parts.minute;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDateInTimezone(dateUtc: Date, timezone: string): string {
  const parts = getLocalParts(dateUtc, timezone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function parseHHMM(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

export function parseQuietHours(value: unknown): QuietWindow | null {
  if (typeof value !== 'string') return null;
  const [startRaw, endRaw] = value.trim().split('-');
  if (!startRaw || !endRaw) return null;
  const start = parseHHMM(startRaw.trim());
  const end = parseHHMM(endRaw.trim());
  if (start === null || end === null || start === end) return null;
  return { start, end, raw: value.trim() };
}

export function isMinuteInQuietWindow(current: number, window: QuietWindow): boolean {
  if (window.start < window.end) return current >= window.start && current < window.end;
  return current >= window.start || current < window.end;
}

function addLocalDays(parts: LocalDateTimeParts, days: number): LocalDateTimeParts {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, parts.hour, parts.minute));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function localPartsAsUtcMs(parts: LocalDateTimeParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);
}

function zonedLocalTimeToUtc(parts: LocalDateTimeParts, timezone: string): Date {
  let utcMs = localPartsAsUtcMs(parts);
  for (let i = 0; i < 4; i += 1) {
    const actual = getLocalParts(new Date(utcMs), timezone);
    const deltaMs = localPartsAsUtcMs(actual) - localPartsAsUtcMs(parts);
    if (deltaMs === 0) break;
    utcMs -= deltaMs;
  }
  return new Date(utcMs);
}

export function nextEligibleAtForQuietHours(dateUtc: Date, timezone: string, window: QuietWindow): string {
  const currentParts = getLocalParts(dateUtc, timezone);
  const currentMinute = minuteOfDay(currentParts);
  const endParts = {
    ...currentParts,
    hour: Math.floor(window.end / 60),
    minute: window.end % 60,
  };
  const target = window.start > window.end && currentMinute >= window.start
    ? addLocalDays(endParts, 1)
    : endParts;
  return zonedLocalTimeToUtc(target, timezone).toISOString();
}

function readMorningBriefTime(
  profile: ExecutiveProfile,
  logger: OperationContext['logger'],
): ScheduledMorningBriefTime {
  const raw = morningBriefPrefs(profile).time;
  const fallback = parseHHMM(DEFAULT_MORNING_BRIEF_TIME);
  if (fallback === null) throw new Error('invalid_default_morning_brief_time');

  if (raw === undefined) return { minute: fallback, raw: DEFAULT_MORNING_BRIEF_TIME };
  if (typeof raw === 'string') {
    const parsed = parseHHMM(raw.trim());
    if (parsed !== null) return { minute: parsed, raw: raw.trim() };
  }

  logger.warn(
    `[executive-brief] invalid morning_brief.time '${String(raw)}', treating as default ${DEFAULT_MORNING_BRIEF_TIME}`,
  );
  return { minute: fallback, raw: DEFAULT_MORNING_BRIEF_TIME };
}

function isMorningBriefScheduledNow(currentMinute: number, scheduledMinute: number): boolean {
  return currentMinute >= scheduledMinute
    && currentMinute <= scheduledMinute + SCHEDULE_TOLERANCE_MINUTES;
}

function nextEligibleAtForScheduledTime(dateUtc: Date, timezone: string, scheduledMinute: number): string {
  const currentParts = getLocalParts(dateUtc, timezone);
  const currentMinute = minuteOfDay(currentParts);
  const scheduledParts = {
    ...currentParts,
    hour: Math.floor(scheduledMinute / 60),
    minute: scheduledMinute % 60,
  };
  const target = currentMinute > scheduledMinute + SCHEDULE_TOLERANCE_MINUTES
    ? addLocalDays(scheduledParts, 1)
    : scheduledParts;
  return zonedLocalTimeToUtc(target, timezone).toISOString();
}

function morningBriefPrefs(profile: ExecutiveProfile): Record<string, unknown> {
  return record(record(profile.pushPreferences).morning_brief);
}

function isMorningBriefEnabled(profile: ExecutiveProfile): boolean {
  return morningBriefPrefs(profile).enabled !== false;
}

function warnInvalidQuietHours(logger: OperationContext['logger'], raw: unknown): void {
  logger.warn(
    `[executive-brief] invalid quiet_hours format '${String(raw)}', treating as no quiet window`,
  );
}

function readQuietHours(profile: ExecutiveProfile, logger: OperationContext['logger']): QuietWindow | null {
  const morningBrief = morningBriefPrefs(profile);
  const prefs = record(profile.pushPreferences);

  if (Object.prototype.hasOwnProperty.call(morningBrief, 'quiet_hours')) {
    const raw = morningBrief.quiet_hours;
    const parsed = parseQuietHours(raw);
    if (parsed) return parsed;
    if (raw !== undefined) {
      // Keep prior no-quiet-window semantics, but surface typos to operators.
      warnInvalidQuietHours(logger, raw);
    }
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(prefs, 'quiet_hours')) {
    const raw = prefs.quiet_hours;
    const parsed = parseQuietHours(raw);
    if (parsed) return parsed;
    if (raw !== undefined) {
      warnInvalidQuietHours(logger, raw);
    }
  }

  return null;
}

function briefSlugFor(localDate: string, executiveId: string): string {
  return `briefs/daily/${localDate}-${executiveId}`;
}

async function writeBriefPage(
  ctx: OperationContext,
  profile: ExecutiveProfile,
  dateUtc: Date,
  timezone: string,
  localDate: string,
  briefMarkdown: string,
): Promise<{ briefSlug: string; briefPath: string }> {
  const briefSlug = briefSlugFor(localDate, profile.executiveId);
  await ctx.engine.putPage(briefSlug, {
    type: 'analysis',
    title: `${profile.displayName} Morning Brief ${localDate}`,
    compiled_truth: briefMarkdown,
    timeline: '',
    frontmatter: {
      executive_id: profile.executiveId,
      generated_at: dateUtc.toISOString(),
      brief_date: localDate,
      timezone,
      generator_stage: 'E2_stub',
      dream_generated: true,
    },
  }, { sourceId: ctx.sourceId ?? 'enterprise' });
  return { briefSlug, briefPath: `${briefSlug}.md` };
}

async function markMorningBriefDisabled(
  engine: BrainEngine,
  profile: ExecutiveProfile,
  disabledAt: Date,
  reason: string,
): Promise<void> {
  const nextPrefs = { ...record(profile.pushPreferences) };
  nextPrefs.morning_brief = {
    ...record(nextPrefs.morning_brief),
    disabled_at: disabledAt.toISOString(),
    disabled_reason: reason,
  };
  await engine.executeRaw(
    `UPDATE executives
        SET push_preferences = $2::jsonb,
            updated_at = now()
      WHERE executive_id = $1`,
    [profile.executiveId, JSON.stringify(nextPrefs)],
  );
}

async function pushWithRetry(
  ctx: OperationContext,
  executiveId: string,
  briefMarkdown: string,
): Promise<{ result: PushResult; failedPermanently: boolean; failureReason?: string }> {
  const { pushMorningBrief: push } = deps();
  let lastReason = 'push_failed';

  for (let attempt = 1; attempt <= PUSH_ATTEMPTS; attempt += 1) {
    try {
      const result = await push(ctx.engine, executiveId, briefMarkdown);
      if (result.pushed || result.skipped) {
        return { result, failedPermanently: false };
      }
      lastReason = result.reason ?? 'push_failed';
      ctx.logger.warn(
        `[executive-brief] push attempt ${attempt}/${PUSH_ATTEMPTS} failed for ${executiveId}: ${lastReason}`,
      );
    } catch (error) {
      lastReason = errorMessage(error);
      ctx.logger.warn(
        `[executive-brief] push attempt ${attempt}/${PUSH_ATTEMPTS} failed for ${executiveId}: ${lastReason}`,
      );
    }
  }

  return {
    result: { pushed: false, skipped: false, reason: lastReason },
    failedPermanently: true,
    failureReason: lastReason,
  };
}

export async function runExecutiveBrief(
  ctx: OperationContext,
  opts: RunExecutiveBriefOpts,
): Promise<ExecutiveBriefResult> {
  if (!opts.executiveId) throw new Error('executiveId_required');

  const dateUtc = normalizeDateUtc(opts.dateUtc);
  const profile = await loadExecutiveProfile(ctx.engine, opts.executiveId);
  if (!profile) return { pushed: false, skipped: 'executive_not_found' };

  if (!isMorningBriefEnabled(profile)) {
    return { pushed: false, skipped: 'morning_brief.disabled' };
  }

  const timezone = safeTimezone(profile.timezone, ctx.logger);
  const localParts = getLocalParts(dateUtc, timezone);
  const currentMinute = minuteOfDay(localParts);
  const quietHours = readQuietHours(profile, ctx.logger);
  if (quietHours) {
    if (isMinuteInQuietWindow(currentMinute, quietHours)) {
      const nextEligibleAt = nextEligibleAtForQuietHours(dateUtc, timezone, quietHours);
      ctx.logger.info(
        `[executive-brief] skipped ${profile.executiveId}: in quiet_hours=${quietHours.raw} next_eligible_at=${nextEligibleAt}`,
      );
      return { pushed: false, skipped: 'in_quiet_hours', nextEligibleAt };
    }
  }

  const scheduledTime = readMorningBriefTime(profile, ctx.logger);
  if (!isMorningBriefScheduledNow(currentMinute, scheduledTime.minute)) {
    const nextEligibleAt = nextEligibleAtForScheduledTime(dateUtc, timezone, scheduledTime.minute);
    ctx.logger.info(
      `[executive-brief] skipped ${profile.executiveId}: before_scheduled_time=${scheduledTime.raw} next_eligible_at=${nextEligibleAt}`,
    );
    return { pushed: false, skipped: 'before_scheduled_time', nextEligibleAt };
  }

  const { generateBrief } = deps();
  const localDate = formatDateInTimezone(dateUtc, timezone);
  const briefMarkdown = generateBrief(profile, dateUtc, { logger: ctx.logger });
  const { briefPath, briefSlug } = await writeBriefPage(ctx, profile, dateUtc, timezone, localDate, briefMarkdown);
  const push = await pushWithRetry(ctx, profile.executiveId, briefMarkdown);

  if (push.failedPermanently) {
    await markMorningBriefDisabled(ctx.engine, profile, dateUtc, push.failureReason ?? 'push_failed');
    ctx.logger.warn(
      `[executive-brief] push permanently failed for ${profile.executiveId}; marked morning_brief.disabled_at`,
    );
    return { briefPath, briefSlug, pushed: false, pushResult: push.result };
  }

  return {
    briefPath,
    briefSlug,
    pushed: push.result.pushed,
    skipped: push.result.skipped ? push.result.reason : undefined,
    pushResult: push.result,
  };
}
