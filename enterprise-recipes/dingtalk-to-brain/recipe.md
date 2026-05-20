# DingTalk to Brain Recipe

Stage C2 implements DingTalk as the MVP true EnterpriseApp integration. The dev deployment can wire the company DingTalk callback to the D2 router once that router exists; this C2 adapter supplies token, webhook, rate-limit, bot, push, and ingest connector behavior.

## App Config

Store the app row in `enterprise_apps` with:

| Field | Meaning |
|---|---|
| `app_id` | Stable deployment id, for example `dingtalk-dev`. |
| `app_type` | Must be `dingtalk`. |
| `display_name` | Operator-facing name. |
| `credentials.appKey` | DingTalk AppKey from the internal app admin page. |
| `credentials.encryptedAppSecret` | A3-encrypted AppSecret; never store plaintext. |
| `config.corpId` | Optional corp id used as the tenant token scope. |
| `config.token` | DingTalk event subscription token / signing secret supplied by PM SOP. |
| `config.aesKey` | DingTalk event subscription AESKey if the admin console emits one. |
| `api_base_url` | Defaults to `https://api.dingtalk.com`. |
| `webhook_callback_url` | `https://ebrain-dev.<your-company>.com/webhook/dingtalk/event`. |

The `DingtalkTokenManager` reads `encryptedAppSecret`, decrypts it locally, calls `POST /v1.0/oauth2/accessToken`, then persists the returned access token encrypted in `enterprise_oauth_tokens` with `token_kind='tenant_access'` and `scope_key = corpId || 'app'`.

## Webhook Flow

1. DingTalk sends events to `POST /webhook/dingtalk/event`.
2. D2 router should pass the raw request to `DingtalkWebhookHandler.verify`.
3. C2 verification requires `timestamp`, `nonce`, and `sign` from headers or query params.
4. Plain JSON callbacks use the newer HMAC-SHA256 path over `timestamp + nonce`; encrypted callbacks use the Token/AESKey path and decode `{"encrypt":"..."}` after signature verification.
5. The handler rejects stale timestamps outside `5 minutes` and keeps an in-memory replay cache for accepted `timestamp:nonce:sign` tuples.
6. `decode` maps `EventType`, `EventId`, and `EventBornTime` into the base `Event` envelope.
7. D2 should enqueue a connector job; sub-connectors then emit `EnterpriseIngestObject` through `upsertEnterpriseObject`.

## Sub-Connectors

| Connector | Source id | Object types | Notes |
|---|---|---|---|
| IM | `dingtalk-im` | `im-message`, `im-thread` | Groups messages by `parentMessageId` or `replyChainId`; approval workflow messages add a canonical facts fence through `emitFactFence`. |
| Docs | `dingtalk-docs` | `doc` | Pulls list + markdown content where available; no OCR or full rich-text reconstruction in MVP. |
| Drive | `dingtalk-drive` | `drive-file` | Stores metadata and `raw_ref`; does not download large files. |
| Calendar | `dingtalk-calendar` | `calendar-event` | Stores event window, organizer, attendees, location, and description. |
| Meeting | `dingtalk-meeting` | `meeting`, `meeting-transcript` | Stores recording URL and transcript if the API returns it; missing transcript is metadata, not a hard failure. |

Each connector must call `app.tokenManager.getToken('tenant_access')`, `app.rateLimiter.acquire(...)`, `checkCircuit`, `upsertEnterpriseObject`, `markIngestError`, and `resetCircuit`. Do not bypass B2 ingest-common or write pages directly.

## Data Mapping

| DingTalk payload | Brain field |
|---|---|
| app/corp scope | `enterprise_apps.app_id`, `enterprise_oauth_tokens.scope_key` |
| message id / thread id | `EnterpriseIngestObject.externalId` |
| conversation id | `metadata.conversation_id` |
| doc id / file id / event id / meeting id | `externalId` |
| sender / owner / attendee ids | `participants` |
| message text / doc markdown / event notes / meeting transcript | `bodyMarkdown` |
| update or create time | `modifiedAt` |
| source URL | `url` |
| DingTalk raw response | `raw` or metadata raw reference |
| MVP classification | `classification = 'L1'` |

## Bot And Push

- Mentions are registered through `DingtalkBotAdapter.onMention`; D2 owns the remote `OperationContext` dispatch path and allowlist.
- Replies use the DingTalk application robot endpoint `POST /v1.0/robot/groupMessages/send` with Markdown card content.
- Proactive user push uses `POST /v1.0/notification/asyncSendV2` and `toUserId`.
- Before sending a user push, C2 checks `executives.push_preferences.dingtalk.disabled_at`; if it is already set, no DingTalk request is made.
- If DingTalk says a user disabled notifications, C2 updates `executives.push_preferences.dingtalk.disabled_at` so later workers do not retry pointless pushes.
