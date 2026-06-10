---
author: Gerald Chen
pubDatetime: 2026-04-13T20:00:00+08:00
title: "Tool Guide 26: Online Subnet Calculator"
slug: blog121_subnet-calculator-guide
featured: false
draft: true
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - 前端
description: "Subnetting is a must-know skill for every backend developer and ops engineer, but calculating CIDR ranges and subnet masks by hand is error-prone. This article shows how to use an online subnet calculator to get subnetting done fast, and digs into how IP addresses, subnet masks, and CIDR actually work."
---

Setting up a new server, carving out VPC ranges, writing `allow` rules in Nginx—any time networking is involved, subnet math is unavoidable. The problem is that the binary arithmetic behind subnet masks is both tedious and easy to get wrong: `/24` is manageable, but which IPs does a `/22` actually cover? Are `10.0.3.255` and `10.0.4.0` in the same subnet? Anything slightly non-trivial and you're reaching for a calculator.

The [online subnet calculator](https://anyfreetools.com/tools/subnet-calculator) automates all of it: enter an IP and a prefix length, and you instantly get the network address, broadcast address, usable IP range, and host count—plus a one-click way to split a large subnet into smaller ones. This article covers how to use the tool, and along the way explains the underlying theory—use it enough and the math sticks on its own.

## Getting Started

Open the [subnet calculator](https://anyfreetools.com/tools/subnet-calculator) and enter an IP address with a prefix length. Both formats are supported:

- **CIDR notation**: `192.168.1.0/24`
- **IP + subnet mask**: `192.168.1.0` + `255.255.255.0`

Hit calculate and you immediately get:

| Field | Example value (input 192.168.1.0/24) |
|------|-------------------------------|
| Network address | 192.168.1.0 |
| Broadcast address | 192.168.1.255 |
| Subnet mask | 255.255.255.0 |
| Wildcard mask | 0.0.0.255 |
| Usable IP range | 192.168.1.1 - 192.168.1.254 |
| Usable hosts | 254 |
| IP type | Private address |

There's also a binary view on the right that makes the boundary between network bits and host bits easy to see.

## What Subnet Masks and CIDR Really Are

To make sense of the tool's output, you need to understand what a subnet mask actually does.

An IPv4 address is 32 bits of binary. For example, `192.168.1.100` in binary is:

```
11000000.10101000.00000001.01100100
```

A subnet mask is also 32 bits: the first N bits are all 1s, and the rest are 0s. The mask for `/24` is:

```
11111111.11111111.11111111.00000000
In decimal: 255.255.255.0
```

**Network address = IP address AND subnet mask** (bitwise AND):

```
11000000.10101000.00000001.01100100   (192.168.1.100)
AND
11111111.11111111.11111111.00000000   (255.255.255.0)
=
11000000.10101000.00000001.00000000   (192.168.1.0)
```

That's why every IP in the same `/24` network must share the same first three octets—they share the same network bits.

**Broadcast address** = the network address with all host bits set to 1:

```
11000000.10101000.00000001.11111111   (192.168.1.255)
```

There are 8 host bits (32-24=8), giving 2^8 = 256 addresses. Subtract the network and broadcast addresses, and you're left with 254 usable host IPs.

## CIDR Prefix Length Cheat Sheet

Different prefix lengths map to networks of different sizes. Here are the common ones:

| CIDR | Subnet mask | Usable hosts | Typical use |
|------|----------|-----------|---------|
| /8 | 255.0.0.0 | 16,777,214 | Large private networks (10.x.x.x) |
| /16 | 255.255.0.0 | 65,534 | Mid-size corporate networks (172.16.x.x) |
| /24 | 255.255.255.0 | 254 | The most common; office LANs |
| /25 | 255.255.255.128 | 126 | Half a Class C, for separating subnets |
| /26 | 255.255.255.192 | 62 | Small departments |
| /27 | 255.255.255.224 | 30 | Server clusters |
| /28 | 255.255.255.240 | 14 | Tiny segments, point-to-point links |
| /30 | 255.255.255.252 | 2 | Router interconnects (only 2 host IPs) |
| /32 | 255.255.255.255 | 0 | Single-host routes |

Can't memorize them? No problem—just type the prefix length into the calculator and the answer is right there.

## Subnetting: Splitting a Large Network

This is one of the calculator's most practical features. Say you have a `10.0.0.0/22` block and need to give four departments their own subnets, with no more than 60 machines per department.

**Step 1: Confirm the size of the /22**

Enter `10.0.0.0/22` and the calculator shows:
- Usable hosts: 1022 (2^10 - 2)
- IP range: 10.0.0.1 - 10.0.3.254

**Step 2: Pick the split granularity**

60 machines need at least 62 addresses (plus the network and broadcast addresses), which maps to `/26` (2^6 = 64, 62 usable).

In the calculator's subnetting panel, choose "split by prefix length," enter `/26`, and the calculator lists all 16 subnets automatically:

```
10.0.0.0/26   Usable: 10.0.0.1  - 10.0.0.62
10.0.0.64/26  Usable: 10.0.0.65 - 10.0.0.126
10.0.0.128/26 Usable: 10.0.0.129- 10.0.0.190
10.0.0.192/26 Usable: 10.0.0.193- 10.0.0.254
10.0.1.0/26   Usable: 10.0.1.1  - 10.0.1.62
... (16 total)
```

Give one to each of the four departments and keep the rest for future growth.

## The Three Private IP Ranges

The calculator automatically flags whether an IP falls within a private address range. Private addresses can't be routed on the public internet and are for internal use only. The three reserved ranges are:

| Range | CIDR | Usable addresses |
|------|------|-----------|
| 10.0.0.0 - 10.255.255.255 | 10.0.0.0/8 | ~16.77 million |
| 172.16.0.0 - 172.31.255.255 | 172.16.0.0/12 | ~1.04 million |
| 192.168.0.0 - 192.168.255.255 | 192.168.0.0/16 | ~65 thousand |

Home routers default to `192.168.1.0/24`, and AWS VPCs default to `10.0.0.0/16`—both within these three ranges.

There are also a few other special ranges:
- `127.0.0.0/8`: loopback addresses (localhost = 127.0.0.1)
- `169.254.0.0/16`: link-local addresses (APIPA, auto-assigned when DHCP fails)
- `0.0.0.0/8`: means "this host," commonly used for default routes

## Real-World Scenario: Configuring an AWS VPC

When configuring a VPC in AWS, you must specify a CIDR block. A common scheme is `10.0.0.0/16`, with subnets carved out per availability zone and function. Using the calculator to plan it out:

**Public subnets** (for Load Balancers and NAT Gateways):
```
10.0.0.0/24   Availability Zone A (254 addresses)
10.0.1.0/24   Availability Zone B
10.0.2.0/24   Availability Zone C
```

**Private subnets** (for application servers):
```
10.0.10.0/24  Availability Zone A
10.0.11.0/24  Availability Zone B
10.0.12.0/24  Availability Zone C
```

**Database subnets** (maximum isolation):
```
10.0.20.0/24  Availability Zone A
10.0.21.0/24  Availability Zone B
```

Verify each block's range and size in the calculator before entering it into the AWS console—much harder to get wrong that way.

## Real-World Scenario: Nginx Access Control

Nginx's `allow` / `deny` directives accept CIDR notation:

```nginx
# 只允许公司内网和 VPN 访问管理后台
location /admin {
    allow 192.168.1.0/24;   # 公司局域网
    allow 10.8.0.0/24;      # VPN 网段
    deny  all;
}
```

If you know the IP range but aren't sure how to express it in CIDR, test it in the calculator: enter `192.168.1.0/24`, confirm its range is `192.168.1.0 - 192.168.1.255`, then write it into your config.

It works in reverse too: given a range like `10.0.4.0 - 10.0.7.255`, the calculator confirms the matching CIDR is `10.0.4.0/22`.

## Supernetting

Subnetting splits a large network into smaller ones; supernetting merges several small networks into one. Say you have four adjacent `/26` blocks:

```
10.0.0.0/26
10.0.0.64/26
10.0.0.128/26
10.0.0.192/26
```

Merged, they form a single `/24`: `10.0.0.0/24`.

The key condition for a valid merge: the starting IP must be the network address of the merged block—that is, the starting IP's host bits (computed against the merged mask) must all be 0. The calculator checks this automatically and warns you when the condition isn't met.

## A Quick Word on IPv6

The tool also supports IPv6 subnet calculations. An IPv6 address is 128 bits, written as 8 groups of hexadecimal, for example:

```
2001:0db8:85a3:0000:0000:8a2e:0370:7334
```

Prefix lengths mean the same thing as in IPv4. Common ones are `/48` (allocated to organizations), `/56` (allocated to homes), and `/64` (the standard size for a single subnet). A single `/64` holds 2^64 ≈ 1.8×10^19 addresses—far more than the entire IPv4 address space—so IPv6 doesn't require the careful subnet budgeting that IPv4 does.

---

Subnet math isn't hard, but doing it by hand invites mistakes, especially with `/22` or `/23` blocks that span Class C boundaries. Hand the arithmetic to a tool and spend your energy on the architectural decisions—which ranges to use, how to structure the hierarchy, how much room to reserve. That's the part worth your time.

## More in This Series

- [Tool Guide 1: Online Image Compression](/en/posts/blog084_image-compress-guide/)
- [Tool Guide #2: Online JSON Formatter](/en/posts/blog085_json-formatter-guide/)
- [Tool Guide #3: Online Regex Tester](/en/posts/blog086_regex-tester-guide/)
- [Tool Guide 4: QR Code Generator](/en/posts/blog089_qrcode-generator-guide/)
- [Tool Guide 5: Base64 Encoder/Decoder](/en/posts/blog090_base64-tool-guide/)
- [Tool Guide 6: Online JWT Decoder](/en/posts/blog092_jwt-decoder-guide/)
- [Tool Guide 7: Unix Timestamp Converter](/en/posts/blog094_timestamp-tool-guide/)
- [Tool Guide 8: Online Password Generator](/en/posts/blog095_password-generator-guide/)
- [Tool Guide 9: URL Encoder/Decoder](/en/posts/blog096_url-encoder-guide/)
- [Tool Guide 10: Online Hash Generator](/en/posts/blog097_hash-generator-guide/)
- [Tool Guide 11: JSON to TypeScript Type Generator](/en/posts/blog099_json-to-typescript-guide/)
- [Tool Guide 12: Online Cron Expression Parser](/en/posts/blog100_cron-parser-guide/)
- [Tool Guide 13: Online Color Converter](/en/posts/blog102_color-converter-guide/)
- [Tool Guide 14: Online SQL Formatter](/en/posts/blog103_sql-formatter-guide/)
- [Tool Guide 15: Online Markdown Live Preview Tool](/en/posts/blog104_markdown-preview-guide/)
- [Tool Guide 16: Online JSON Diff Tool](/en/posts/blog106_json-diff-guide/)
- [Tool Guide 17: AI Token Counter](/en/posts/blog107_token-counter-guide/)
- [Tool Guide 18: Online OCR Text Recognition](/en/posts/blog108_ocr-tool-guide/)
- [Tool Guide 19: Online CSS Gradient Generator](/en/posts/blog110_css-gradient-guide/)
- [Tool Guide 20 - Online UUID Generator](/en/posts/blog111_uuid-generator-guide/)
- [Tool Guide 21: HTML to JSX Online Converter](/en/posts/blog112_html-to-jsx-guide/)
- [Tool Guide 22: Online WebSocket Tester](/en/posts/blog114_websocket-tester-guide/)
- [Tool Guide 23: Free Online CSV to JSON Converter](/en/posts/blog116_csv-to-json-guide/)
- [Tool Guide 24: Online CSS Box Shadow Generator](/en/posts/blog118_box-shadow-guide/)
- [Tool Guide 25: Online Favicon Generator](/en/posts/blog120_favicon-generator-guide/)
