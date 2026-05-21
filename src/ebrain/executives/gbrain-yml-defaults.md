# Ebrain executives sync exclusions

Stage E1 keeps executive-local SOUL material out of the brain index by
documenting the brain-repo `gbrain.yml` defaults operators should add manually.
The Ebrain runtime does not mutate user config silently.

```yaml
sync:
  exclude_globs:
    - "executives/*/SOUL.md"
    - "executives/*/USER.md"
    - "executives/*/preferences.yml"
    - "executives/*/personal-skills/**"
```

`AGENT_PERSONA.md` is intentionally not listed here because it is the subagent
persona contract rather than the executive's private SOUL or preferences.
