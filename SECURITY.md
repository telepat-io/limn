# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | ✅ |

## Reporting a Vulnerability

To report a security vulnerability, please open a [private vulnerability report](https://github.com/telepat-io/limn/security/advisories/new) through the repository's Security Advisories flow, or open a minimal issue through the [repository issue tracker](https://github.com/telepat-io/limn/issues) without disclosing sensitive detail.

We aim to acknowledge reports within 48 hours and provide an initial assessment within 5 business days.

## Security Model

### API Key Handling

- **Keychain storage** — `limn settings set` stores API keys in the OS keychain (macOS Keychain / Linux libsecret) by default.
- **Environment variables** — `OPENROUTER_API_KEY` and `REPLICATE_API_TOKEN` are respected as the highest-precedence credential sources. This is the recommended path for CI and containerized environments.
- **No plaintext files** — Limn does not write API keys to dotfiles, plaintext config files, or logs.
- **Secret redaction** — `limn settings list` displays configured secret values as `***configured***`. Secrets are never included in CLI output, logs, or error messages.

### Configuration

- `LIMN_DISABLE_KEYTAR=true` disables keychain access entirely, falling back to environment variables only. Use this when keychain integration is unavailable or undesirable.
- `openrouterModel` is the only non-secret configuration value stored in plaintext. It does not contain credentials.

### Dependencies

- Prompt transformation: LLM calls via [OpenRouter](https://openrouter.ai/).
- Image generation: via [Replicate](https://replicate.com/).
- No user data is sent to third parties beyond these two service providers.
- Generated images are model‑produced output. Review content before publication or distribution.

## Vulnerability Disclosure Timeline

We follow coordinated disclosure. Once a fix is validated, we will publish an advisory through GitHub Security Advisories.
