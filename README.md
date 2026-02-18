# oc-ghcp-headers

> [!WARNING]
> This is experimental software provided as-is. Use it at your own risk.
> Modifying request behavior may lead to degraded service, policy enforcement, or account-level actions.
> The authors and contributors are not responsible for any resulting account issues, restrictions, or losses.

This plugin controls the `x-initiator` header for GitHub Copilot requests in OpenCode.

## Behavior

- First user message in a session: `x-initiator` is randomized between `user` and `agent`.
- Follow-up user messages: `x-initiator` defaults to `agent`, with optional chance to send `user`.

The plugin determines first vs follow-up by reading recent session messages and checking for prior assistant/tool activity.
It explicitly ignores the current turn's pre-created user message and assistant placeholder so first-turn detection stays accurate.

If session history cannot be loaded, it fails closed to `agent`.

## Setup

Install from npm:

```bash
bun add oc-ghcp-headers
```

Then enable it in `~/.config/opencode/opencode.jsonc`:

```json
{
  "plugin": ["oc-ghcp-headers"]
}
```

Restart OpenCode after updating config.

## Configuration

Configure percentages in `opencode.json` / `opencode.jsonc` under `provider.github-copilot.options`:

```json
{
  "provider": {
    "github-copilot": {
      "options": {
        "firstMessageAgentPercent": 0,
        "followupMessageAgentPercent": 100
      }
    }
  }
}
```

- `firstMessageAgentPercent` (default `0`)
  - Percentage chance first message is sent as `agent`
  - `0` => always `user`
  - `10` => 10% `agent`, 90% `user`
  - `100` => always `agent`
- `followupMessageAgentPercent` (default `100`)
  - Percentage chance follow-up message is sent as `agent`
  - `100` => always `agent`
  - `90` => 90% `agent`, 10% `user`
  - `0` => always `user`
- `DEBUG_ENABLED`
  - Enable/disable plugin debug logging

## Scope

- Applies only to models where `providerID` includes `github-copilot`.
- This plugin only sets request headers; auth/token handling remains managed by OpenCode.

## Debug Log

- Log file: `/tmp/oc-ghcp-headers-debug.log`
- Watch live:

```bash
tail -f /tmp/oc-ghcp-headers-debug.log
```

## Maintainer Docs

- Publishing and release process: `docs/release.md`

## License

- MIT. See `LICENSE`.

## Credits

- Original custom plugin author: [@Tarquinen](https://github.com/Tarquinen/)
