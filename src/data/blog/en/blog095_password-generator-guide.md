---
author: Gerald Chen
pubDatetime: 2026-03-21T14:00:00+08:00
title: "Tool Guide 8: Online Password Generator"
slug: blog095_password-generator-guide
featured: false
draft: true
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - 安全
description: "A deep dive into what makes a strong password: how password entropy is calculated, common attack techniques and how to defend against them, why randomness is the heart of password security, and how to generate high-strength passwords quickly."
---

How many accounts do you have right now? Email, social media, banking, cloud services, developer platforms, all kinds of SaaS tools... Most people have 50-100 online accounts, and heavy users can easily exceed 200.

Now a second question: how many distinct passwords do you have?

If the answer is far smaller than your account count, you're not alone. According to NordPass, the most common password in the world is still `123456`, with `password` in second place. Even people who work in tech routinely compromise between "secure" and "easy to remember" — taking one base password, tweaking it slightly, and reusing it across sites.

The problem is that this compromise can be very expensive. This article looks at passwords from the attacker's perspective: what actually makes a password strong, what "random" really means, and how to generate and manage passwords efficiently.

## How Passwords Get Cracked

Before we talk about "good passwords," let's look at how attackers crack them. Understanding the attacks is what lets you defend against them.

### Brute Force

The most direct approach: try every possible character combination.

Suppose a password is 8 lowercase letters. That's 26^8 ≈ 208.8 billion combinations. Sounds like a lot, but modern GPUs can compute billions of hashes per second. A single RTX 4090 running MD5 manages roughly 164 billion hashes per second (source: Hashcat benchmarks). In other words, an 8-character lowercase password can be **exhaustively searched in under 2 seconds**.

### Dictionary Attack

Instead of brute-forcing character by character, attackers match against lists of common passwords. Public password dictionaries routinely contain hundreds of millions of entries, all harvested from past data breaches. If your password is `qwerty123` or `iloveyou`, it's basically in the top 1,000 of every dictionary.

### Rule-based Attack

A souped-up dictionary attack. The attacker applies transformation rules to dictionary words: capitalize the first letter, append digits, swap `a` for `@`, swap `o` for `0`. So `P@ssw0rd` may look "complex," but to a rule-based attack it's no different from `password`.

### Rainbow Table

Precompute hashes for huge numbers of passwords and store them in a lookup table. Once an attacker obtains a hash, they just look it up — no real-time computation required. This is exactly why modern systems salt their passwords: the same password with a different salt produces a completely different hash, rendering rainbow tables useless.

### Credential Stuffing

Take usernames and passwords leaked from site A and try them on sites B, C, and D. If you use the same password on multiple sites, one breach means they all fall.

## The Core Metric of Password Strength: Entropy

The standard measure of password strength in cryptography is **information entropy**, measured in bits.

The formula:

```text
entropy = log2(charset size ^ password length)
        = password length × log2(charset size)
```

Charset size depends on the range of characters you use:

| Character type | Charset size | Entropy per character |
|----------|-----------|-------------|
| Digits only (0-9) | 10 | 3.32 bit |
| Lowercase letters only (a-z) | 26 | 4.70 bit |
| Mixed case letters (a-z, A-Z) | 52 | 5.70 bit |
| Mixed case + digits | 62 | 5.95 bit |
| Mixed case + digits + special characters | 95 | 6.57 bit |

Some concrete examples:

- `123456` (6 digits): 6 × 3.32 = 19.9 bit — extremely weak
- `password` (8 lowercase letters): 8 × 4.70 = 37.6 bit — weak
- `Tr0ub4dor&3` (the XKCD #936 example, 11 mixed characters): theoretical ceiling around 72 bit, but since it's a leet-speak variant of the dictionary word "troubador," the real entropy is far lower (XKCD estimates roughly 28 bit)
- `K#9xMp!2vL$w` (12 characters, full charset): 12 × 6.57 = 78.8 bit — strong
- `correct horse battery staple` (4 random words from a ~2048-word list): about 44 bit — looks simple, but stronger than a dictionary-variant password

Commonly recommended strength thresholds:

- **Minimum acceptable**: 50+ bit
- **Recommended**: 70+ bit
- **High-security scenarios** (master passwords, encryption keys): 80+ bit

### A Counterintuitive Fact

Look at the examples above: `correct horse battery staple` is a passphrase made of 4 ordinary English words. It looks trivially simple, yet its entropy is far from low. This comes from the classic XKCD comic #936, whose core point is: **length matters more than complexity**.

There's a catch, though: those 4 words must be **chosen at random**. If it's a "meaningful" phrase you came up with yourself, like `i love my dog`, the entropy drops dramatically — attackers build dictionaries specifically targeting common phrases.

## Why Passwords You "Think Up" Aren't Random Enough

Humans are inherently bad at producing randomness. Psychology experiments have shown again and again that when people are asked to pick numbers "at random," the results skew toward predictable patterns:

- A tendency to avoid repetition (truly random sequences repeat all the time)
- A preference for certain numbers (7 gets picked far more often than chance would predict)
- Recency bias (people tend to pick whatever they just saw)

Passwords are the same. Ask someone to "think of a random password" and most people will:

- Build it from a word or a name
- Apply predictable substitutions (`@` for `a`, `1` for `l`)
- Tack a digit or symbol onto the end

Every one of these patterns is already in attackers' rule sets. So a **genuinely secure password must be generated by an algorithm** — not by a human brain.

## How Password Generation Works Under the Hood

A proper password generator needs two things: a **cryptographically secure pseudo-random number generator (CSPRNG)** and a **sufficiently large character space**.

### Secure Randomness in the Browser

In the browser, `Math.random()` is not safe — it uses a pseudo-random algorithm (typically xorshift128+) that is predictable and reproducible. The right approach is the Web Crypto API:

```javascript
// 生成安全的随机字节
const array = new Uint32Array(1);
crypto.getRandomValues(array);

// 生成指定长度的密码
function generatePassword(length, charset) {
  const result = [];
  const charsetArray = [...charset];
  for (let i = 0; i < length; i++) {
    const randomValues = new Uint32Array(1);
    crypto.getRandomValues(randomValues);
    const index = randomValues[0] % charsetArray.length;
    result.push(charsetArray[index]);
  }
  return result.join("");
}

const password = generatePassword(16, 
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
);
```

Under the hood, `crypto.getRandomValues()` calls the operating system's CSPRNG (`/dev/urandom` on Linux, `BCryptGenRandom` on Windows), so the security is solid.

### Modulo Bias

The code above has a subtle flaw: `randomValues[0] % charsetArray.length` introduces modulo bias.

A Uint32 ranges from 0 to 4294967295. If the charset size doesn't divide 4294967296 evenly, some characters get a slightly higher probability of being picked. For example, with a charset of 95, 4294967296 / 95 = 45210182 remainder 6, which means the first 6 characters are slightly more likely than the other 89.

In practice this bias is small enough to ignore, but if you want it perfect, use rejection sampling:

```javascript
function secureRandomIndex(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  let value;
  do {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % max;
}
```

Now every character has exactly the same probability of being selected.

### Node.js

In Node.js, the equivalent API lives in the `crypto` module:

```javascript
const crypto = require("crypto");

function generatePassword(length, charset) {
  const result = [];
  for (let i = 0; i < length; i++) {
    const randomByte = crypto.randomInt(charset.length);
    result.push(charset[randomByte]);
  }
  return result.join("");
}
```

`crypto.randomInt()` already handles modulo bias internally, so you can use it as-is.

### Python

Python 3.6+ ships the `secrets` module, designed specifically for cryptographic use cases:

```python
import secrets
import string

def generate_password(length=16):
    charset = string.ascii_letters + string.digits + string.punctuation
    return "".join(secrets.choice(charset) for _ in range(length))

print(generate_password())
```

Don't use the `random` module here — its Mersenne Twister algorithm is not cryptographically secure.

## Choosing a Password Policy

With the theory covered, back to the practical question: how should you actually set passwords in daily use?

### Regular Accounts

- Length: 14-16 characters
- Charset: mixed case letters + digits + special characters
- Entropy: roughly 85-105 bit
- Generation: auto-generated by a password manager or an [online password generator](https://anyfreetools.com/tools/password-generator)
- No memorization needed — let the password manager store it

### Master Passwords (Password Manager, System Login)

- Use a passphrase (random words)
- 4-6 randomly chosen common English words
- Entropy: roughly 44-77 bit (EFF Diceware 7776-word list: 4 words ≈ 51.7 bit, 6 words ≈ 77.5 bit; common 2048-word list: 4 words ≈ 44 bit)
- Advantages: easy to remember, hard to mistype
- Example: `marble sunset anchor diagram velocity`

### Minimum Requirements by Scenario

| Scenario | Minimum length | Recommended entropy | Notes |
|------|---------|--------|------|
| Forums, test accounts | 12 chars | 50 bit | Low-value accounts |
| Email, social media | 14 chars | 70 bit | Account recovery hub |
| Banking, payments | 16 chars | 80 bit | High-value targets |
| Master passwords, encryption keys | 20 chars or 5 words | 90+ bit | Highest security tier |

## Modern Password Management

Generating strong passwords is only step one — managing them is the long-term challenge.

### Password Managers

The most recommended approach today is a password manager (1Password, Bitwarden, KeePass, etc.). The core logic:

1. Memorize one strong master password
2. Let the manager generate and store everything else
3. Use a different random password for every site
4. Auto-fill — no manual typing

That way, even if one site suffers a breach, the blast radius is limited to that single account.

### Two-Factor Authentication (2FA)

A strong password plus 2FA is current best practice. Even if a password leaks, no one can log in without the second factor. Prefer TOTP (e.g., Google Authenticator) or hardware keys (e.g., YubiKey), and avoid SMS codes when possible (they're vulnerable to SIM swapping).

### The Periodic-Rotation Myth

Traditional security policy mandated changing passwords every 90 days. But NIST explicitly recommends against this in SP 800-63B — frequent rotation pushes users toward weaker passwords (because they have to remember them), which lowers overall security. The right strategy: **use strong random passwords, and only change them when you have confirmed a compromise**.

## When Online Tools Come In Handy

A password manager is the best solution, but there are situations where an online password generator is more convenient:

- You need a strong password right now and don't have a password manager at hand
- You're setting up initial credentials for a new environment (servers, databases, API keys)
- You need passwords in bulk (test data, batch account provisioning)
- You want to quickly see how different parameters affect password strength

The [password generator](https://anyfreetools.com/tools/password-generator) supports custom length and charset combinations (mixed case letters, digits, special characters) and shows a real-time strength score. All computation happens locally in your browser — passwords are never sent to a server.

A handy trick: if you need to generate a password quickly from the command line, a one-liner will do:

```bash
# macOS / Linux
openssl rand -base64 24 | tr -d '/+=' | head -c 16

# 或者用 /dev/urandom
LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*' < /dev/urandom | head -c 16
```

But for non-technical users, a graphical online tool is obviously a much lower barrier.

## Common Misconceptions

**"Longer passwords are always more secure"** — Length is indeed the most important factor, but only if the password is random. `aaaaaaaaaaaaaaaa` is 16 characters long with near-zero entropy.

**"Special characters make passwords more secure"** — Adding special characters enlarges the charset, but the effect is far smaller than adding length. A 12-character letters-only password (~68 bit) is stronger than an 8-character full-charset one (~53 bit).

**"If the strength meter says 'strong,' it's secure"** — Most websites' strength checks only look at character variety and length, not actual randomness. `Password1!` usually rates as "strong," yet it crumbles instantly under a dictionary attack.

**"A password I can remember is safer than a random one"** — Quite the opposite. Any password a human can remember, an attacker can guess. Password security is fundamentally a fight against computing power, not against human memory.

## Summary

Password security boils down to three principles:

1. **Randomness**: generate with a CSPRNG; never make passwords up yourself
2. **Length first**: 14+ characters, longer when possible
3. **Uniqueness**: one independent password per account

In practice, manage all your account passwords with a password manager, use a strong passphrase as the master password, and add 2FA on top — that covers the vast majority of security needs. And when you need a quick one-off password, an [online password generator](https://anyfreetools.com/tools/password-generator) is a handy tool to reach for.

Security isn't a one-time task — it's an ongoing habit.

---

**Other articles in this series**:
- [Tool Guide 1: Online Image Compression](/en/posts/blog084_image-compress-guide/) - How image size optimization works in practice
- [Tool Guide #2: Online JSON Formatter](/en/posts/blog085_json-formatter-guide/) - JSON parsing, formatting, and validation
- [Tool Guide #3: Online Regex Tester](/en/posts/blog086_regex-tester-guide/) - Debugging and optimizing regular expressions
- [Tool Guide 4: QR Code Generator](/en/posts/blog089_qrcode-generator-guide/) - QR Code encoding principles and generation
- [Tool Guide 5: Base64 Encoder/Decoder](/en/posts/blog090_base64-tool-guide/) - Base64 encoding fundamentals and use cases
- [Tool Guide 6: Online JWT Decoder](/en/posts/blog092_jwt-decoder-guide/) - JWT structure and security practices
- [Tool Guide 7: Unix Timestamp Converter](/en/posts/blog094_timestamp-tool-guide/) - Timestamps and time zone handling
