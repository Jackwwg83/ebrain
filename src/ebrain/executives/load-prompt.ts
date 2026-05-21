import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import type { ExecutiveProfile } from '../types.ts';
import { parse as parseYaml, stringify as stringifyYaml } from '../../core/yaml-lite.ts';

export interface LoadExecutivePromptOptions {
  rootDir?: string;
  subagentBody?: string;
}

function resolveProfilePath(path: string, rootDir?: string): string {
  return isAbsolute(path) ? path : join(rootDir ?? process.cwd(), path);
}

function readRequired(path: string, rootDir?: string): string {
  return readFileSync(resolveProfilePath(path, rootDir), 'utf8').trimEnd();
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trimEnd()}`;
}

function preferencesSection(path: string, rootDir?: string): string {
  const absolutePath = resolveProfilePath(path, rootDir);
  const parsed = existsSync(absolutePath)
    ? parseYaml(readFileSync(absolutePath, 'utf8'))
    : {};
  const yaml = Object.keys(parsed).length > 0 ? stringifyYaml(parsed) : '{}\n';
  return section('PREFERENCES', `\`\`\`yaml\n${yaml.trimEnd()}\n\`\`\``);
}

function personalSkillSections(root: string, rootDir?: string): string[] {
  const absoluteRoot = resolveProfilePath(root, rootDir);
  if (!existsSync(absoluteRoot)) return [];

  const skillFiles = readdirSync(absoluteRoot)
    .filter((file) => file.endsWith('.md'))
    .sort();

  const sections = skillFiles.slice(0, 5).map((file) => {
    const content = readFileSync(join(absoluteRoot, file), 'utf8');
    return section(`PERSONAL_SKILL: ${file}`, content);
  });

  if (skillFiles.length > 5) {
    sections.push(section('MORE', '... (more available in personal-skills/)'));
  }

  return sections;
}

export async function loadExecutivePrompt(
  profile: ExecutiveProfile,
  options: LoadExecutivePromptOptions = {},
): Promise<string> {
  const sections = [
    section('SOUL', readRequired(profile.soulPath, options.rootDir)),
    section('USER', readRequired(profile.userPath, options.rootDir)),
    section('AGENT_PERSONA', readRequired(profile.agentPersonaPath, options.rootDir)),
    preferencesSection(profile.preferencesPath, options.rootDir),
    ...personalSkillSections(profile.personalSkillsRoot, options.rootDir),
  ];

  if (options.subagentBody?.trim()) {
    sections.push(section('SUBAGENT_DEF', options.subagentBody));
  }

  return `${sections.join('\n\n')}\n`;
}
