---
author: Gerald Chen
pubDatetime: 2026-04-25T14:00:00+08:00
title: "Tool Guide 47: Online Password Strength Checker"
slug: blog147_password-strength-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
  - 安全
description: "A guide to using an online password strength checker, covering how password entropy is calculated, how the zxcvbn algorithm detects common weak-password patterns, and how to integrate a password strength meter into your web project."
---

"At least 8 characters, with uppercase, lowercase, and digits" — you've seen this rule a thousand times. But does it actually make passwords secure? `Password1` satisfies every requirement, yet it's one of the most common passwords in existence. Meanwhile, `correct-horse-battery-staple` looks casual but is far more secure than most "complex" passwords.

Password strength isn't measured by how many character types you use — it's measured by **entropy**: the number of guesses an attacker needs to crack it. The [online password strength checker](https://anyfreetools.com/tools/password-strength) analyzes your password in real time, telling you exactly how secure it is via entropy and estimated crack time, and pointing out the specific weaknesses.

## What Is Password Entropy

Entropy comes from information theory and measures the degree of uncertainty. For passwords, higher entropy means an attacker needs more attempts to guess correctly.

The formula:

```
entropy (bits) = log2(charset size ^ password length)
              = password length × log2(charset size)
```

Examples:

| Password | Charset | Length | Entropy |
|------|--------|------|----|
| `1234` | Digits (10) | 4 | 13 bits |
| `abcd1234` | Lowercase + digits (36) | 8 | 41 bits |
| `Abcd1234!` | Mixed case + digits + symbols (95) | 9 | 59 bits |
| `correct-horse-battery-staple` | Lowercase + symbols (27) | 28 | 132 bits |

The last example comes from xkcd comic #936, which famously demonstrated that four random common words make a far more secure password than a short, seemingly complex one.

But pure entropy calculation has a flaw: it assumes every character is chosen at random. In real passwords, `Password1!` has decent theoretical entropy, but because humans follow predictable patterns (capitalize the first letter, append a digit or exclamation mark), its actual security is far lower than random characters.

## The zxcvbn Algorithm

Modern password strength checkers use algorithms that better model real-world attacks. The most influential is **zxcvbn**, open-sourced by Dropbox (named after a row of keyboard characters — itself a classic weak password).

Instead of just counting character types, zxcvbn actively detects the patterns humans tend to choose:

**1. Dictionary matching**

Built-in corpora include:
- 100,000+ most common passwords (`password`, `123456`, `qwerty`, etc.)
- English word lists
- Common names (`michael`, `jennifer`, `dragon`)
- Pop culture terms

Any part of the password that matches a dictionary word gets its entropy slashed.

**2. Keyboard pattern detection**

```
qwerty, asdfgh, zxcvbn   ← horizontal keyboard rows
qazwsx, 1qaz2wsx          ← vertical keyboard columns
@#$%^&                     ← symbol row
```

These patterns may not appear in any dictionary, but they're guaranteed to be in an attacker's rule set.

**3. Dates and years**

```
1990, 19901225, 12/25/1990, 2024, 2025
```

Birthdays, anniversaries, and the current year are the most common number choices.

**4. Repeats and sequences**

```
aaaa, 1111, abcd, 1234, dcba, 9876
```

The actual entropy of these patterns is far below their theoretical value.

**5. l33t speak (character substitution)**

```
p@ssw0rd  → password
@dm1n     → admin
s3cur1ty  → security
```

Attacker rule sets include all the common letter substitutions, so these "mutations" add very little security.

**6. Composite detection**

`Password1!` gets parsed as: `Password` (dictionary word) + `1` (sequence) + `!` (trailing symbol, a common pattern). Its overall security is far lower than the charset size would suggest.

## Tool Walkthrough

Open [https://anyfreetools.com/tools/password-strength](https://anyfreetools.com/tools/password-strength), type a password into the input box, and the tool shows in real time:

- **Strength rating**: Very Weak / Weak / Fair / Strong / Very Strong (mapping to zxcvbn scores 0-4)
- **Crack time estimates**: estimated time for an offline slow-hash attack (bcrypt-style hashes, roughly 10 guesses per second) and an online throttled attack
- **Entropy**: the password's entropy in bits, for quantitative comparison
- **Weakness explanations**: exactly which pattern is dragging the score down (e.g. "contains the common word 'password'", "trailing digit sequence")
- **Improvement suggestions**: how adding a few characters or changing the pattern would significantly boost strength

On the right there's a visibility toggle — input is hidden by default, click to reveal temporarily. All analysis happens locally; your password is never sent to a server.

## What Crack Times Actually Mean

The tool shows crack times under two scenarios:

**Offline slow-hash attack**: the attacker has obtained your hash (e.g. from a database breach) and uses dedicated hardware against a bcrypt/scrypt-protected hash. At bcrypt cost 12, that's roughly 10–100 guesses per second (hardware-dependent; GPU clusters can do more).

**Online throttled attack**: the attacker hits the login endpoint directly and is rate-limited to about 10 attempts per second.

The same password's crack time varies enormously between scenarios:

| Password | Offline crack time | Online crack time |
|------|------------|------------|
| `1234` | Instant | Seconds |
| `password` | Instant | Seconds |
| `P@ssw0rd` | Hours | Decades |
| `correct-horse-battery-staple` | Millions of years | Age of the universe |

**Key takeaway**: if your database is ever breached, weak passwords are cracked almost immediately. A sound password policy must be designed for the worst case — offline attacks.

## What Actually Makes a Password Secure

### Passphrases

A phrase made of four or more random common words is far more secure than a complex short password — and much easier to remember:

```
correct-horse-battery-staple    ← ~44 bits (random selection from a 2048-word list; larger word lists like Diceware yield higher entropy)
purple-cloud-seven-bridge
```

Memory trick: build an absurd mental scene — "seven bridges on a purple cloud" — far easier to remember than `P@ssw0rd123!`.

### Random Passwords from a Password Manager

The most secure approach is letting a password manager generate and store fully random passwords:

```
xK9#mP2$nQ7@vL4&   ← 16-character random password, ~105 bits
```

You never need to memorize it — let the password manager (1Password, Bitwarden, Dashlane, etc.) do that. Use a different password for every site, so one breach doesn't compromise the rest.

### Patterns to Avoid

- Any real dictionary word (including l33t speak variants)
- Personal information (names, birthdays, phone numbers)
- Keyboard patterns (`qwerty`, `123456`, `asdfgh`)
- Trailing digits or exclamation marks (`password1`, `password!`)
- Years (especially recent ones)

## Integrating Password Strength Checks into Your Project

Giving users real-time strength feedback works far better than static rule reminders.

### Using zxcvbn

```bash
npm install zxcvbn
```

```typescript
import zxcvbn from "zxcvbn";

const result = zxcvbn("P@ssw0rd123");

console.log(result.score);          // 0-4，0最弱，4最强
console.log(result.crack_times_display.offline_slow_hashing_1e4_per_second);
// 输出："less than a second"、"3 hours"、"centuries" 等

console.log(result.feedback.warning);
// "This is similar to a commonly used password"

console.log(result.feedback.suggestions);
// ["Add another word or two. Uncommon words are better."]
```

### React Component Example

```tsx
import { useState } from "react";
import zxcvbn from "zxcvbn";

const strengthLabels = ["非常弱", "弱", "一般", "强", "非常强"];
const strengthColors = ["#e53e3e", "#dd6b20", "#d69e2e", "#38a169", "#2b6cb0"];

export function PasswordInput() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  const result = password ? zxcvbn(password) : null;

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type={show ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="输入密码"
        />
        <button onClick={() => setShow(!show)}>
          {show ? "隐藏" : "显示"}
        </button>
      </div>

      {result && (
        <div>
          {/* 强度条 */}
          <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor:
                    i <= result.score
                      ? strengthColors[result.score]
                      : "#e2e8f0",
                }}
              />
            ))}
          </div>

          {/* 强度标签 */}
          <span style={{ color: strengthColors[result.score], fontSize: 14 }}>
            {strengthLabels[result.score]}
          </span>

          {/* 破解时间 */}
          <p style={{ fontSize: 12, color: "#718096" }}>
            离线破解时间：
            {result.crack_times_display.offline_slow_hashing_1e4_per_second}
          </p>

          {/* 反馈建议 */}
          {result.feedback.warning && (
            <p style={{ color: "#dd6b20", fontSize: 12 }}>
              {result.feedback.warning}
            </p>
          )}
          {result.feedback.suggestions.map((s, i) => (
            <p key={i} style={{ color: "#718096", fontSize: 12 }}>
              {s}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Server-Side Validation (Node.js)

Client-side strength checking is just UX — a real security policy validates on the server too:

```typescript
import zxcvbn from "zxcvbn";

function validatePassword(password: string, userInputs: string[] = []): {
  valid: boolean;
  message?: string;
} {
  const MIN_SCORE = 2; // 至少"一般"强度
  const MIN_LENGTH = 8;

  if (password.length < MIN_LENGTH) {
    return { valid: false, message: `密码至少需要 ${MIN_LENGTH} 位` };
  }

  // userInputs 传入用户名、邮箱等，防止密码包含这些信息
  const result = zxcvbn(password, userInputs);

  if (result.score < MIN_SCORE) {
    const warning = result.feedback.warning || "密码强度不足";
    const suggestion = result.feedback.suggestions[0] || "";
    return {
      valid: false,
      message: `${warning}。${suggestion}`,
    };
  }

  return { valid: true };
}

// 使用示例
const check = validatePassword("P@ssw0rd", ["alice", "alice@example.com"]);
// { valid: false, message: "This is similar to a commonly used password。Add another word or two." }
```

The `userInputs` parameter takes the username, email, and similar values — zxcvbn adds them to its dictionary, preventing users from using their own name as a password.

## Common Password Policy Mistakes

**Mistake 1: Forcing frequent password rotation**

NIST (the US National Institute of Standards and Technology) updated its guidelines in 2017 to explicitly recommend against mandatory periodic password changes. When forced to change passwords frequently, users typically just increment a trailing digit: `Password1` → `Password2` → `Password3`. This adds almost nothing to security while significantly burdening users.

**Mistake 2: More complex rules mean more security**

Rules like "must contain uppercase, lowercase, digits, and special characters" push users toward predictable passwords (`Password1!`). A more effective policy: set a minimum entropy requirement instead of character-type rules.

**Mistake 3: Shorter but more complex is better**

Length contributes to entropy linearly; charset size contributes logarithmically. Doubling a password from 8 to 16 characters improves entropy far more than expanding the charset from 36 to 95.

---

Tool link: [Password Strength Checker](https://anyfreetools.com/tools/password-strength)

Real password strength isn't about satisfying a checklist of rules — it's about entropy: making your password unpredictable to attackers. Random passphrases or password-manager-generated passwords, combined with proper storage (bcrypt/Argon2 hashing), are what reliable password security actually looks like.
