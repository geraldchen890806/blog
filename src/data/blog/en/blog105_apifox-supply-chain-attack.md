---
author: Gerald Chen
pubDatetime: 2026-03-28T19:00:00+08:00
title: "Apifox Supply Chain Attack Post-Mortem: Your SSH Keys May Already Be Compromised"
slug: blog105_apifox-supply-chain-attack
featured: true
draft: false
reviewed: true
approved: true
tags:
  - 安全
  - 开发效率
description: "In March 2026, the Apifox desktop client was hit by a supply chain attack: a JS file on the official CDN was replaced with a malicious version that stole users' SSH keys, Git credentials, and other sensitive data. A technical breakdown of the attack chain, blast radius, and how to check if you were affected."
---

On March 25, security researcher @ohyishi disclosed a serious incident on X: the Apifox desktop client had been hit by a supply chain attack. The SlowMist security team published a detailed analysis shortly after.

If you used the Apifox desktop client between **March 4 and March 22, 2026** (Windows, macOS, and Linux are all affected), your SSH private keys, Git credentials, and shell history may already be in someone else's hands.

This isn't a theoretical risk—users on V2EX have already confirmed they were compromised, finding anomalous GitHub login records that appeared while they were asleep.

## What Happened

Apifox is an Electron-based API collaboration platform that's widely used among developers in China. On startup, its desktop client loads a JavaScript file from the official CDN:

```text
https://cdn.apifox.com/www/assets/js/apifox-app-event-tracking.min.js
```

This file was originally a legitimate analytics script, about 34KB in size. But starting March 4, it was intermittently replaced with a poisoned version that ballooned to 77KB—the extra bytes were the malicious code.

The attacker appended heavily obfuscated malicious JavaScript to the end of the legitimate code. Because the file was hosted on Apifox's own official CDN, every security check waved it through as a trusted resource.

## Breaking Down the Attack

The attack chain has four stages:

### Stage 1: Missing Electron Sandbox

Apifox's Electron desktop app didn't strictly enable the sandbox option and exposed Node.js APIs to the renderer process. That means JavaScript running in the renderer could do more than manipulate the DOM—it could directly call Node.js system-level APIs like the filesystem and child processes.

A properly configured Electron app should enable sandbox isolation, so renderer JS can only talk to the main process through a limited interface exposed by a preload script. Apifox skipped this layer of protection, which is what made the attack possible.

### Stage 2: CDN Resource Tampering

The attacker tampered with the JS file on Apifox's official CDN. This is the critical step—it wasn't a poisoned npm package or a backdoor hidden in a GitHub repo. They directly modified a static asset on the CDN.

That means the attacker either breached Apifox's CDN management system or it was an insider job (there's been plenty of debate about this on V2EX). Apifox is still investigating the root cause.

The poisoned version didn't fire on every load—it had a probabilistic trigger mechanism, which made the problem much harder to spot. Some users ran Apifox daily during the 18-day attack window and never got hit; others opened it once and were compromised.

### Stage 3: Malicious Payload Execution

Once loaded, the poisoned script fetched a second-stage payload from an attacker-controlled domain, `apifox[.]it[.]com`. The domain was deliberately named to look like apifox.com, hosted on Cloudflare, and stayed alive for 18 days.

After execution, the payload would:

1. **Harvest sensitive data**:
   - Everything under `~/.ssh/` (including private keys)
   - `~/.git-credentials` (plaintext Git credentials)
   - `~/.zsh_history` and `~/.bash_history` (command history)
   - `~/.kube/*` (Kubernetes configs), `~/.npmrc` (npm tokens), `~/.zshrc` (environment variables)
   - `~/.subversion/*` (SVN credentials)
   - The list of currently running processes

2. **Exfiltrate the data**: harvested data was Gzip-compressed, AES-256-GCM encrypted (hardcoded key), Base64-encoded, and sent to `apifox[.]it[.]com/event/0/log`

3. **Stay active**: the malicious code had a built-in random timer (30 minutes to 3 hours), repeatedly collecting data and talking to C2 as long as Apifox stayed running. The C2 platform could in theory push arbitrary follow-up payloads, including backdoor installation and lateral movement, though none has been publicly confirmed so far

### Stage 4: Anti-Detection Measures

The attacker put serious effort into code obfuscation:

- Multiple layers of obfuscation applied with `javascript-obfuscator`
- All strings encrypted with RC4 and decrypted dynamically at runtime
- Numeric constants replaced with multi-step arithmetic expressions to evade static analysis
- C2-delivered payloads encrypted with RSA, exfiltrated data encrypted with AES-256-GCM, layered to defeat traffic analysis
- Malicious code appended after legitimate code, exploiting CDN allowlisting to bypass security checks

## Blast Radius

**Affected users**:
- Everyone who used the Apifox **public SaaS desktop client** between March 4 and March 22, 2026
- All three platforms—Windows, macOS, and Linux—are affected
- The Apifox web version and self-hosted deployments are not affected

**Potentially leaked data**:
- SSH private keys (the `~/.ssh/` directory)
- Git credentials (`~/.git-credentials`)
- Shell command history (which may contain plaintext passwords, tokens, etc.)
- Apifox account accessToken
- System process information

Note that macOS's TCC mechanism protects user directories like Desktop, Documents, and Downloads, but hidden files like `~/.ssh/`, `~/.git-credentials`, and `~/.zsh_history` are **not covered by TCC**—any application can read them freely. So macOS users face essentially the same risk as Windows and Linux users. Don't assume you're safe.

## How to Check If You Were Hit

### Method 1: Check LevelDB Storage

The malicious script writes markers into Apifox's local storage. Check for the `rl_mc` or `rl_headers` keys:

**macOS**:
```bash
grep -arlE "rl_mc|rl_headers" "$HOME/Library/Application Support/apifox/Local Storage/leveldb"
```

**Windows (PowerShell)**:
```powershell
Select-String -Path "$env:APPDATA\apifox\Local Storage\leveldb\*" -Pattern "rl_mc","rl_headers" -List | Select-Object Path
```

**Linux**:
```bash
grep -arlE "rl_mc|rl_headers" ~/.config/apifox/Local\ Storage/leveldb
```

If you get any output, you were **confirmed compromised**.

### Method 2: Check for Anomalous Connections

Look for the malicious domain in Apifox's network persistent state file:

**macOS**:
```bash
grep "apifox.it.com" "$HOME/Library/Application Support/apifox/Network Persistent State"
```

### Method 3: Check for System Anomalies

- Audit the last-access times on your `~/.ssh/` directory
- Check `crontab -l` (Linux/macOS) for unexpected scheduled jobs
- On macOS, check `~/Library/LaunchAgents/` for unknown plist files
- On Linux, check `/etc/systemd/system/` for anomalous services

## Remediation

If you've confirmed compromise—or can't rule it out—treat everything as leaked:

1. **SSH keys**: generate a new key pair, replace the public key on every server and Git platform (GitHub, GitLab), and revoke the old keys
2. **Git credentials**: reset Personal Access Tokens on all Git platforms
3. **API keys**: rotate every API key and password that ever appeared in your shell history. K8s users should reset kubeconfig; npm users should reset npm tokens
4. **Apifox account**: log out and back in to force-invalidate the old token, and change your password
5. **Clear malicious data**: run this in the Apifox developer tools console:
   ```javascript
   localStorage.removeItem('_rl_headers');
   localStorage.removeItem('_rl_mc');
   ```
6. **Upgrade the client**: update to v2.8.19 or later
7. **Network blocking**: block `apifox.it.com` and all its subdomains at the firewall or DNS level

## The Deeper Problems

This incident exposes a few issues every developer should care about:

### The Security Risk of Electron Apps

A huge number of developer tools are built on Electron (VS Code, Postman, Slack, Discord...). Electron itself isn't the problem—the problem is that many apps don't configure their security policies correctly:

- Renderer sandbox not enabled (`sandbox: true`)
- `nodeIntegration` not disabled
- No limits on what the `preload` script can do
- Loading uncontrolled remote resources

A misconfigured Electron app is essentially a browser with system privileges—any JS that gets loaded can read and write files and execute commands.

### A Broken CDN Trust Chain

We habitually trust resources on the "official CDN." But this attack proves the CDN itself can be compromised. Judging trustworthiness by domain alone isn't enough—you need SRI (Subresource Integrity) checks and content signing on top.

### Probabilistic Triggering Makes Detection Harder

The attacker deliberately made the malicious behavior fire only some of the time, which dramatically extended the time to discovery. A security team running routine checks might just happen to not trigger it; a user who occasionally hits something weird might chalk it up to network issues.

### Was This Really a "Supply Chain Attack"?

Plenty of developers on V2EX and elsewhere have questioned whether this qualifies as a "supply chain attack" at all. Strictly speaking, a supply chain attack means an upstream link in the trust chain was compromised (a poisoned npm package, a hijacked CI/CD pipeline). Here, it was Apifox's own CDN that got tampered with—which looks more like a direct breach or an internal issue. The community has criticized Apifox's "supply chain attack" framing as deflecting blame.

For end users, though, it doesn't matter which category the attack falls into. The impact is the same: software you trusted became the attack vector.

## Takeaways for Developers

1. **Principle of least privilege**: developer tools don't need full disk access—macOS users shouldn't grant permissions casually
2. **Key hygiene**: protect SSH private keys with a passphrase, and use a password manager (1Password, Bitwarden) instead of plaintext files
3. **Rotate credentials regularly**: even without a security incident, critical credentials should be rotated on a schedule
4. **Watch security advisories**: subscribe to the security notification channels of the tools you use
5. **Consider alternatives**: if your API testing needs are simple, curl + jq, Hoppscotch (open source), and Bruno (local-first) are all solid options

Every desktop app you install is a potential attack surface. Apifox won't be the last.

One interesting detail: security researchers found that the Stage-1 entry code used 7 layers of obfuscation, but the Stage-2 payload delivered by C2 retained full Chinese comments (including tutorial-style notes like "the salt must also be provided"). The attacker poured effort into obfuscating the front end but left the back end in plaintext—an OPSEC inconsistency that's either sloppiness in a team operation, or something else entirely.

---

**IoC (Indicators of Compromise)**:
- Malicious domain: `apifox[.]it[.]com` and its subdomains
- Tampered file: `cdn.apifox.com/www/assets/js/apifox-app-event-tracking.min.js` (the 77KB version)
- SHA256: `91d48ee33a92acef02d8c8153d1de7e7fe8ffa0f3b6e5cebfcb80b3eeebc94f1`

**References**:
- [SlowMist security team analysis](https://slowmist.medium.com/security-alert-supply-chain-attack-on-apifox-desktop-client-via-compromised-official-cdn-script-bc3870992564)
- [Apifox official announcement](https://mp.weixin.qq.com/s/GpACQdnhVNsMn51cm4hZig)
- [V2EX community discussion](https://www.v2ex.com/t/1201146)
