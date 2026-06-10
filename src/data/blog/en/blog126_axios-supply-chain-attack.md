---
author: Gerald Chen
pubDatetime: 2026-04-17T08:30:00+08:00
title: "Inside the Axios Poisoning: How a North Korean APT Infected Millions of Developer Environments in 3 Hours"
slug: blog126_axios-supply-chain-attack
featured: true
draft: false
reviewed: true
approved: true
tags:
  - 安全
  - AI Agent
  - 前端
description: "In March 2026, the axios npm package was hijacked by a North Korean state-level APT, planting a RAT into millions of developer environments within 3 hours. This post breaks down two separate but related incidents: the full supply-chain poisoning attack chain, and the technical mechanics and real-world exploitability debate around CVE-2026-40175 (CVSS 10.0)."
---

In the early hours of March 31, 2026, an npm package downloaded over 100 million times a week spread a remote access trojan (RAT) within 3 hours. The victims were developers and CI/CD pipelines running `npm install` worldwide. This isn't a hypothetical scenario. It already happened.

The package is `axios`.

---

## Two Incidents, One Time Window

Before unpacking what happened, you need to separate two distinct events that the media blurred together:

**Incident 1: Supply-chain poisoning (2026-03-31)**
Attackers hijacked the maintainer's npm account and published `axios@1.14.1` and `axios@0.30.4` containing a RAT.

**Incident 2: CVE-2026-40175 (disclosed 2026-04-10)**
A separate code-level vulnerability disclosed amid the high attention on the poisoning incident, scored CVSS 10.0, but with disputed real-world exploitability.

These two events happened to erupt in the same window, amplifying the overall impact and complicating the response. This post takes them apart one at a time.

---

## Incident 1: Supply-Chain Poisoning

### Who Was Behind It

Microsoft Threat Intelligence attributed the attack to **Sapphire Sleet**, while Google Threat Intelligence calls it **UNC1069** — both are different names for the same North Korean state-level APT group. While analyzing the macOS payload, Elastic Security Labs found "significant overlap" with the known North Korean WAVESHAPER backdoor.

This wasn't an isolated event. SANS research shows that from 2026-03-19 to 03-27, the same group (internally known as TeamPCP) had already attacked 4 open-source projects back to back: Trivy, KICS, LiteLLM, and Telnyx. axios was the 5th target — and the one with the largest blast radius.

### Step One: Staging

The attackers didn't modify axios source code directly. Their approach was more subtle: they injected a dependency that had never appeared in any historical axios version — `plain-crypto-js@4.2.1` — into `package.json`, then used npm's `postinstall` hook to automatically run malicious code at install time.

The timeline shows the attackers staged everything 24 hours in advance:

```
2026-03-30 05:57 UTC  — plain-crypto-js@4.2.0 published (clean decoy version)
2026-03-30 23:59 UTC  — plain-crypto-js@4.2.1 published (malicious postinstall)
2026-03-31 00:21 UTC  — axios@1.14.1 published (depends on the malicious package above)
2026-03-31 01:00 UTC  — axios@0.30.4 published (legacy branch, 39 minutes later)
2026-03-31 ~03:15 UTC — npm pulled both malicious versions
```

Publishing a clean version first gave the `plain-crypto-js` account some history, dodging npm's automated alerts on brand-new accounts. This detail shows the attackers had deep knowledge of npm's security mechanisms.

As for how they got hold of axios maintainer jasonsaayman's npm account: legitimate releases use the GitHub Actions OIDC trusted publishing mechanism (cryptographically bound to the GitHub Actions workflow), whereas the malicious versions were published manually with a classic access token, and the account's bound email had been changed to `ifstap@proton.me` before the attack. Social engineering or credential theft — there's no publicly confirmed conclusion yet.

### Step Two: The Dropper

The `postinstall` hook of `plain-crypto-js@4.2.1` runs `node setup.js`. This file uses two layers of obfuscation:

- **Layer one**: string reversal + Base64 decoding
- **Layer two**: XOR encryption, key `OrDeR_7077`, using a position-dependent index of `7 × i² % 10`

Once decoded, the script detects the current OS (`process.platform`) and sends an HTTP POST to the C2 server `sfrclak.com:8000` to download the platform-specific Stage 2 payload.

After it finishes, the script deletes itself (`fs.unlink()` removes its own file) and replaces the malicious `package.json` with a clean stub disguised as `4.2.0`. This makes the version reported by `npm list` and `npm audit` differ from reality, effectively muddying any post-incident forensics.

### Step Three: Platform-Specific RAT

| Platform | Implementation | Drop Path |
|------|------|---------|
| macOS | C++ (Mach-O binary) | `/Library/Caches/com.apple.act.mond` |
| Windows | PowerShell | `%TEMP%\6202033.ps1`, executed by a VBScript loader |
| Linux | Python | `/tmp/ld.py` |

The RAT across all three platforms uses the same communication protocol: HTTP POST with a Base64-encoded JSON body, a 60-second heartbeat, and support for `kill`, `peinject` (process injection), `runscript`, and `rundir` commands.

One detail is worth noting: the User-Agent is faked as `"mozilla/4.0 (compatible; msie 8.0; windows nt 5.1; trident/4.0)"` — IE8 + Windows XP. In 2026 network traffic, this UA would instantly trip any halfway-decent EDR alert. Either it's an oversight by the attackers, or they figured their targets (developer workstations and CI servers) mostly lack traffic-layer detection.

After the RAT establishes a connection, the first thing it does is send a `FirstInfo` message containing: hostname, username, OS version, timezone, hardware model, CPU type, the full process list (up to 1000 processes on macOS), and **all environment variables**.

That last item is the core objective. Environment variables on developer workstations and in CI/CD environments typically contain:

- npm tokens (usable to publish malicious packages)
- AWS/GCP/Azure credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- Kubernetes configs
- database passwords
- assorted API keys

North Korean APT campaigns typically target cryptocurrency and tech companies. A developer workstation holding AWS credentials is worth far more than the machine itself.

### Actual Blast Radius

- **axios weekly downloads**: over 100 million
- **npm packages depending on axios**: over 174,000
- **lifetime of the malicious versions**: about 3 hours
- **affected vector**: developer machines and CI/CD pipelines using floating version constraints like `^1.13.6` or `^0.29.0` that ran `npm install` during the attack window
- **not affected**: browser/CDN users (the postinstall hook doesn't run in the browser)

Unit 42 confirmed affected industries spread across the US, Europe, the Middle East, South Asia, and Australia, covering finance, high tech, healthcare, retail, insurance, and more.

### If Your Machine Got Infected

**Rebuild it. Don't repair it.**

If, between 2026-03-31 00:21–03:15 UTC, your machine or CI pipeline ran `npm install` and pulled in `axios@1.14.1` or `axios@0.30.4`, you should:

1. Treat the machine as fully compromised and take it offline immediately
2. Reformat and rebuild from a known-clean image
3. Rotate every credential that ever existed on that machine: npm tokens, SSH keys, AWS/GCP/Azure keys, all API keys
4. Block the C2 at the network layer: `sfrclak.com` and `142.11.206.73:8000`

**Do not just uninstall the package.** The Stage 2 RAT has already dropped and persisted; removing axios won't remove it.

Quick check commands:

```bash
# Check whether a malicious version was ever installed
npm list axios | grep -E "1\.14\.1|0\.30\.4"

# macOS: check for the RAT drop file
ls -la /Library/Caches/com.apple.act.mond 2>/dev/null

# Windows: check for drop files
dir "%PROGRAMDATA%\wt.exe" 2>nul
dir "%TEMP%\6202033.ps1" 2>nul

# Linux: check for the drop file
ls -la /tmp/ld.py 2>/dev/null

# Check for suspicious network connections
# macOS/Linux
lsof -i | grep sfrclak
# Check DNS resolution history (macOS)
log show --last 7d | grep sfrclak
```

---

## Incident 2: CVE-2026-40175 (CVSS 10.0)

This is a separate code-level vulnerability found and disclosed under the spotlight of the supply-chain incident. Its CVSS base score is 10.0, but its real-world exploitability is far more complicated than the number suggests.

### How the Vulnerability Works

When merging HTTP request headers in `lib/adapters/http.js`, Axios doesn't validate header values for CRLF (`\r\n`) characters. On its own, this is an HTTP header injection (CWE-113) vulnerability.

But to exploit it all the way to "stealing AWS credentials," three conditions must hold simultaneously:

**Condition one: a prototype pollution vulnerability in the dependency tree**

The attacker needs to find a library your app depends on indirectly (such as `qs`, `minimist`, `ini`, or `body-parser`) that has a prototype pollution vulnerability, allowing arbitrary properties to be injected onto `Object.prototype`.

**Condition two: Axios inherits the polluted property as a request header**

When merging request configs, Axios iterates over object properties and inadvertently inherits the malicious header property injected onto `Object.prototype` (e.g. `X-aws-ec2-metadata-token-ttl-seconds: 21600\r\n`). With no CRLF validation, this value is passed verbatim to the underlying HTTP library.

**Condition three: CRLF splits the request, smuggling it to IMDS**

A header value containing CRLF splits one HTTP request into two (HTTP request smuggling, CWE-444), one of which is quietly redirected to the AWS EC2 Instance Metadata Service (`169.254.169.254`). By injecting the `X-aws-ec2-metadata-token-ttl-seconds` header, it bypasses IMDSv2's token protection and ultimately obtains the temporary IAM credentials bound to the EC2 instance.

The full attack chain:

```
Prototype pollution in an upstream dependency
  → Object.prototype gets injected with a malicious header value containing \r\n
    → Axios inherits it as a request header with no validation
      → the HTTP request is split by CRLF (request smuggling)
        → the smuggled request makes an SSRF call to 169.254.169.254
          → bypasses the IMDSv2 token mechanism
            → obtains EC2 IAM credentials → cloud environment compromised
```

### The Exploitability Debate

After the CVSS 10.0 score landed, Aikido Security published a rebuttal analysis on 2026-04-14, with one core argument:

**The Node.js runtime blocks this attack chain at a lower level.**

Before sending an HTTP request, Node.js has built-in header value validation. If a header value contains `\r\n` characters, Node.js throws `TypeError [ERR_INVALID_CHAR]: Invalid character in header content` before it ever reaches the network layer, blocking it outright.

Even more persuasive: the vulnerability reporter, Raul Vega Del Valle, confirmed himself that "in a real app... this shouldn't happen... Node, Bun, or Deno would all block the CRLF."

So where does the CVSS 10.0 come from? The score is based on the vulnerability's theoretical impact at the library level, without fully accounting for the Node.js runtime's compensating controls. This isn't unusual in security research — CVSS describes a vulnerability's potential maximum impact, not its actual exploitability in a specific runtime environment.

**Scenarios that still carry risk**: applications using a custom Axios adapter (bypassing the Node.js HTTP client to write raw sockets directly) remain at theoretical risk. That said, this is a very rare configuration.

**Bottom line**: upgrade to `axios@1.15.0` (the 1.x branch) or `axios@0.31.0` (the 0.x branch) to fix this vulnerability. But there's no need to trigger a top-tier incident response just because of the CVSS 10.0 — in a standard Node.js environment, actual exploitation is extremely difficult.

```bash
# Upgrade command
npm install axios@latest
# Or pin a specific version
npm install axios@1.15.0
```

---

## What Structural Problems This Incident Exposed

### 1. Single-Maintainer Risk

axios is a Top 10 package on npm by downloads, yet for a long time it had only one active maintainer: jasonsaayman. A single npm account compromised by social engineering or credential theft was enough to spread a RAT to millions of environments.

This isn't jasonsaayman's fault. It's a structural problem in the open-source ecosystem: the most critical infrastructure often depends on volunteer maintainers, and those maintainers can't possibly match the protection level of a dedicated security team.

### 2. The `postinstall` Hook Is a High-Risk Attack Surface

npm's `postinstall` hook automatically runs arbitrary code during `npm install`, with no user confirmation. This mechanism makes the cost of landing a supply-chain attack extremely low — the attacker only needs to control the publish rights of one dependency.

```bash
# Production and CI/CD should standardize on this flag
npm ci --ignore-scripts
```

`--ignore-scripts` skips all lifecycle hooks. The cost is that some packages requiring native module compilation will fail to install, but for the vast majority of pure-JS dependencies, this is a low-cost defense.

### 3. Floating Version Constraints Amplified the Impact

`"axios": "^1.13.6"` means `npm install` will automatically pull the latest version within the semver-compatible range, including `1.14.1`. With the attack window being only 3 hours, if your `package-lock.json` had already pinned an older version, `npm ci` would be unaffected. But if you used `npm install`, or ran `npm update` during those 3 hours, you got hit.

### 4. Credentials Shouldn't Be Stored in Plaintext Environment Variables

One of this attack's core objectives was to steal environment variables. Developer workstations and CI/CD systems are full of `export AWS_SECRET_ACCESS_KEY=...`. This is common industry practice — and exactly the harvest scenario supply-chain attacks love most.

Safer alternatives: AWS IAM Roles (no credentials needed on EC2/Lambda), GitHub OIDC (Actions assume an IAM Role directly, no static keys), and HashiCorp Vault or AWS Secrets Manager for managing sensitive credentials.

---

## Checklist

**Act now**:

- [ ] Check `package.json` and `package-lock.json` to confirm you're on `axios@1.14.0` or `axios@1.15.0+`, not `1.14.1`
- [ ] If any machine ran `npm install` during 2026-03-31 00:21–03:15 UTC, check the IoCs above
- [ ] Upgrade to `axios@1.15.0` to fix CVE-2026-40175

**Process improvements**:

- [ ] Switch CI/CD pipelines to `npm ci --ignore-scripts`
- [ ] Move sensitive credentials to a Secrets Manager; don't leave them in plaintext environment variables
- [ ] Consider pinning critical dependencies to exact versions (`"axios": "1.15.0"` instead of `"^1.15.0"`)
- [ ] Evaluate whether to add `npm audit --audit-level=critical` to your CI flow

**IoC quick reference**:

| Type | Value |
|------|-----|
| Malicious axios versions | `1.14.1`, `0.30.4` |
| Malicious dependency | `plain-crypto-js@4.2.1` |
| C2 domain | `sfrclak.com` |
| C2 IP | `142.11.206.73:8000` |
| macOS drop file | `/Library/Caches/com.apple.act.mond` |
| Windows drop files | `%PROGRAMDATA%\wt.exe`, `%TEMP%\6202033.ps1` |
| Linux drop file | `/tmp/ld.py` |
| Network detection signature | User-Agent containing `msie 8.0; windows nt 5.1` |

---

The frightening thing about the axios poisoning isn't how technically sophisticated it was — it's how fragile it revealed the modern development toolchain to be: one hijacked maintainer account, one `postinstall` hook, 3 hours, millions of environments. The luck the attackers needed was far less than we'd like to believe.

> This post is a synthesis of public reports from Elastic Security Labs, StepSecurity, Aikido Security, and the Microsoft Security Blog. All IoCs and technical details come from those sources.

**Further reading**:
- [Elastic Security Labs: Full technical analysis of the axios poisoning](https://www.elastic.co/security-labs/axios-one-rat-to-rule-them-all)
- [StepSecurity: Detailed supply-chain attack report](https://www.stepsecurity.io/blog/axios-compromised-on-npm-malicious-versions-drop-remote-access-trojan)
- [Aikido Security: Real-world exploitability analysis of CVE-2026-40175](https://www.aikido.dev/blog/axios-cve-2026-40175-a-critical-bug-thats-not-exploitable)
- [Microsoft Security Blog: Sapphire Sleet attribution and mitigation guide](https://www.microsoft.com/en-us/security/blog/2026/04/01/mitigating-the-axios-npm-supply-chain-compromise/)
