---
author: Gerald Chen
pubDatetime: 2026-02-11T18:00:00+08:00
title: "Two Handy Online Tools Now Live on the Blog: QR Code Generator & CSV to JSON"
slug: online-tools
featured: true
draft: true
tags:
  - 工具
  - 前端
description: "Introducing two new client-side online tools on the blog: a QR code generator/decoder and a CSV to JSON converter."
---

## The Tools Are Live!

A tech blog doesn't have to be just articles—it can ship useful little tools too. Today I'm launching two fully client-side online tools: nothing to install, no sign-up, no data ever uploaded to a server. Just open your browser and go.

👉 [Tools home](/tools)

---

## 1. 📱 QR Code Generator & Decoder

**URL**: [/tools/qrcode](/tools/qrcode)

### What can it do?

**Generate QR codes**: Type any text or URL and a QR code image is generated in real time, with one-click PNG download.

**Decode QR codes**: Upload a QR code image and it automatically recognizes and displays the content. Scanner broken? Just upload a screenshot.

### Use cases

- Quickly generate a Wi-Fi sharing QR code
- Encode a snippet of text as a QR code to send to a coworker
- Got a QR code screenshot and don't feel like pulling out your phone? Upload it and decode directly
- Generate a QR code for a shortened URL

### How it's built

Fully client-side, using [qrcode](https://github.com/soldair/node-qrcode) for generation and [jsQR](https://github.com/cozmo/jsQR) for decoding. All computation happens locally in your browser—**your data never leaves your device**.

---

## 2. 📊 CSV to JSON

**URL**: [/tools/csv-to-json](/tools/csv-to-json)

### What can it do?

Convert CSV data to JSON in real time. Two modes are supported:

**Standard mode**: each CSV row becomes a JSON object, with the first row used as field names.

```
name,age,city
Alice,30,Beijing
Bob,25,Shanghai
```

Output:

```json
[
  { "name": "Alice", "age": "30", "city": "Beijing" },
  { "name": "Bob", "age": "25", "city": "Shanghai" }
]
```

**Key mode** (triggered automatically when the first column is `key`): each column produces its own JSON file, with the values in the key column used as keys. This mode is especially handy for **internationalization (i18n)**:

```
key,en,zh,ja
logout,Logout,登出,ログアウト
login,Login,登入,ログイン
```

It automatically generates three files:

**en.json**
```json
{ "logout": "Logout", "login": "Login" }
```

**zh.json**
```json
{ "logout": "登出", "login": "登入" }
```

**ja.json**
```json
{ "logout": "ログアウト", "login": "ログイン" }
```

Each file can be **copied** or **downloaded individually**, or you can **download them all** with one click.

### Use cases

- The backend hands you CSV data but the frontend needs JSON
- Multilingual translation spreadsheet → per-language i18n JSON files, instantly
- CSV exported from Excel → quick API mock data
- Custom delimiters (Tab, semicolon, and more)

### How it's built

Also fully client-side, with support for both file upload and manual input. The CSV parser handles edge cases like quote escaping and custom delimiters.

---

## Why client-side tools?

1. **Privacy** — your data never leaves the browser and never touches a server
2. **Zero dependencies** — nothing to install, just open and use
3. **Works offline** — once the page loads, it keeps working without a network connection
4. **Fast** — no network requests; conversion happens in real time

More handy tools are on the way.

👉 [Try them now](/tools)
