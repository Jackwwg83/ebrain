export interface DerivedExecutivePaths {
  agentPersonaPath: string;
  userPath: string;
  preferencesPath: string;
  personalSkillsRoot: string;
  subagentName: string;
}

export function derivePathsFromSoulPath(
  soulPath: string,
  executiveId: string,
): DerivedExecutivePaths {
  const normalizedSoulPath = soulPath.replace(/\\/g, '/');
  const lastSlash = normalizedSoulPath.lastIndexOf('/');
  const basename = normalizedSoulPath.slice(lastSlash + 1);
  if (basename !== 'SOUL.md') {
    throw new Error(`soul_path basename must be SOUL.md, got: ${basename}`);
  }
  const root = lastSlash === -1 ? '' : normalizedSoulPath.slice(0, lastSlash + 1);

  return {
    agentPersonaPath: `${root}AGENT_PERSONA.md`,
    userPath: `${root}USER.md`,
    preferencesPath: `${root}preferences.yml`,
    personalSkillsRoot: `${root}personal-skills/`,
    subagentName: executiveId,
  };
}
