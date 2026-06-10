---
author: Gerald Chen
pubDatetime: 2026-04-10T14:00:00+08:00
title: "Tool Guide 23: Free Online CSV to JSON Converter"
slug: blog116_csv-to-json-guide
featured: false
draft: true
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - 前端
description: "A free online CSV to JSON converter that turns tabular data into JSON without writing any code, with support for custom delimiters, type inference, multiple output formats, and more."
---

CSV and JSON are the two dominant formats for data exchange. CSV works well for tabular data—it's human-readable and opens directly in Excel. JSON is the standard for frontend-backend APIs, config files, and NoSQL databases. Converting between the two is something developers do all the time.

This post walks through the [CSV to JSON online converter](https://anyfreetools.com/tools/csv-to-json) on anyfreetools.com. No dependencies to install—just open your browser and convert.

## How CSV and JSON Differ

CSV (Comma-Separated Values) is a plain-text format where fields are separated by commas (or another delimiter), and the first row is usually the header with column names:

```csv
id,name,age,city
1,Alice,28,Beijing
2,Bob,32,Shanghai
3,Charlie,25,Guangzhou
```

After conversion to JSON, each row becomes an object with the column names as keys:

```json
[
  { "id": "1", "name": "Alice", "age": "28", "city": "Beijing" },
  { "id": "2", "name": "Bob", "age": "32", "city": "Shanghai" },
  { "id": "3", "name": "Charlie", "age": "25", "city": "Guangzhou" }
]
```

Looks simple, but real-world conversion involves quite a few details:

- **Data types**: every value in CSV is a string—should numbers and booleans be converted automatically?
- **Empty values**: should an empty field become `null`, `""`, or be omitted entirely?
- **Delimiters**: some CSVs use tabs (TSV) or semicolons
- **Quote escaping**: when a field contains a comma, CSV wraps it in quotes, and the parser has to handle that correctly
- **Nested structures**: can the output be nested JSON instead of a flat array of objects?

An online tool handles all of these details for you, so you don't have to write parsing code by hand.

## The Technical Details of CSV

### RFC 4180 and Quote Escaping

CSV has no single official specification; the de facto standard is RFC 4180. The core rule: **if a field contains the delimiter, it must be wrapped in double quotes; if the field itself contains a double quote, escape it with two consecutive double quotes**.

```csv
name,bio
Alice,"Engineer, Backend"
Bob,"He said ""hello"" to me"
```

In the first row, Alice's `bio` contains a comma, so it must be quoted. In the second row, Bob's bio contains double quotes, which must be written as `""hello""` to parse correctly. CSVs that break this rule end up with misaligned columns or truncated content when parsed.

### Encoding: GBK vs UTF-8

On Chinese-language Windows systems, Excel exports CSV in GBK/GB2312 encoding by default, while virtually every modern development environment (Node.js, Python, databases, APIs) uses UTF-8. Feed a GBK file straight into a UTF-8 parser and any Chinese text turns into mojibake.

Two ways to fix it:

1. In Excel, choose "CSV UTF-8 (Comma delimited)" when saving—Excel prepends a BOM (byte order mark, `\xEF\xBB\xBF`) to explicitly mark the file as UTF-8
2. Convert the encoding in code: read with `encoding='gbk'`, write with `encoding='utf-8'`

The BOM itself isn't content, but if the parser doesn't strip it, the first column name picks up an invisible extra character, and lookups by column name silently fail. Python's `utf-8-sig` encoding and BOM stripping in Node.js exist precisely to solve this.

### Line Ending Differences

Line endings in CSV vary by operating system:

- Windows: `\r\n` (CRLF)
- Unix/Linux/macOS: `\n` (LF)
- Classic Mac (OS 9 and earlier): `\r` (CR)

Excel on Windows exports CSV with `\r\n`. Most parsing libraries handle this automatically, but if you parse CSV with a hand-rolled regex or `split('\n')`, stray `\r` characters end up at the tail of field values—a subtle bug that's painful to track down.

## Core Features

### Input Methods

Two ways to get data in:

**Paste directly**: paste CSV text into the input box—great for quickly converting small amounts of data.

**Upload a file**: click the upload button and pick a local `.csv` file—better for larger datasets.

### Delimiter Options

The tool supports custom column delimiters. Common choices:

| Delimiter | Symbol | Typical Source |
|--------|------|----------|
| Comma | `,` | Standard CSV, Excel exports |
| Tab | `\t` | TSV format, Excel/database exports |
| Semicolon | `;` | Default Excel export in European locales |
| Pipe | `\|` | Some logs and config files |

If the output looks garbled because the wrong delimiter was selected, just switch delimiters and the problem goes away.

### Output Formats

Several output options are available:

**Array format (default)**: each row becomes an object, all objects go into an array—the right shape for most API scenarios:

```json
[
  { "name": "Alice", "age": 28 },
  { "name": "Bob", "age": 32 }
]
```

**Key-value format**: one column serves as the key and the remaining columns as the value, producing an object instead of an array. Useful when you need fast lookups by ID:

```json
{
  "1": { "name": "Alice", "age": 28 },
  "2": { "name": "Bob", "age": 32 }
}
```

### Nested JSON Structures

Standard conversion produces a flat array of objects. But sometimes the data is inherently hierarchical—`address.city` and `address.country` really belong nested under an `address` object.

Tools that support nesting use a dot (`.`) as the separator in column names:

```csv
name,address.city,address.country
Alice,Beijing,CN
```

The conversion automatically produces a nested structure:

```json
[
  {
    "name": "Alice",
    "address": {
      "city": "Beijing",
      "country": "CN"
    }
  }
]
```

If you don't want nesting, keep column names flat—the tool won't split ordinary column names.

### Type Inference

The tool offers an automatic type inference option:

- **On**: purely numeric fields become number, `true`/`false` become boolean, empty values become `null`
- **Off**: every field stays a string (useful when you need precise control—phone numbers should never become numbers)

### Pretty Print and Minify

Output options include:

- **Pretty Print**: indented, easy to read and debug
- **Minified**: whitespace and newlines stripped, smaller payload, suited for production

## Hands-On Examples

### Example 1: Handling Excel Exports

The usual headaches when exporting CSV from Excel are encoding and delimiters. Excel on Chinese-language Windows exports GBK by default, with commas as delimiters.

Paste the data into the tool's input box, select comma as the delimiter, turn on type inference, and you get a clean JSON array ready for API requests or database imports.

### Example 2: Database Query Results to JSON

Database tools (Navicat, DBeaver, etc.) can export query results as CSV. Run the export through this tool to get JSON, then hand it to the frontend or import it into a NoSQL database like MongoDB.

Source CSV (exported from MySQL):

```csv
user_id,email,created_at,is_active
101,alice@example.com,2024-01-15 10:30:00,1
102,bob@example.com,2024-02-20 09:00:00,0
```

Converted result (type inference on):

```json
[
  {
    "user_id": 101,
    "email": "alice@example.com",
    "created_at": "2024-01-15 10:30:00",
    "is_active": 1
  },
  {
    "user_id": 102,
    "email": "bob@example.com",
    "created_at": "2024-02-20 09:00:00",
    "is_active": 0
  }
]
```

Note: the `is_active` values are `1`/`0`, which the tool converts to number; if you need booleans, convert them yourself.

### Example 3: Tab-Separated TSV Files

Some exports come as TSV (Tab-Separated Values), with a `.tsv` or `.txt` extension. Switch the tool's delimiter to tab and it parses correctly, for example:

```text
user_id	name	score
1	Alice	95
2	Bob	87
```

The result is identical to comma-separated CSV—the tool generates a JSON array of objects keyed by column name.

### Example 4: Bulk Importing Config Data

Say you need to bulk-create config entries from an Excel sheet filled out by the operations team:

```csv
key,value,description,enabled
max_retry,3,最大重试次数,true
timeout,5000,请求超时(ms),true
debug_mode,false,调试模式,false
```

With type inference on:

```json
[
  { "key": "max_retry", "value": 3, "description": "最大重试次数", "enabled": true },
  { "key": "timeout", "value": 5000, "description": "请求超时(ms)", "enabled": true },
  { "key": "debug_mode", "value": false, "description": "调试模式", "enabled": false }
]
```

The numbers in the `value` column are correctly recognized as number, and `true`/`false` in `enabled` become boolean. Note that the `value` of the `debug_mode` row, `false`, is also inferred as boolean—if your business logic needs the literal string `"false"`, turn type inference off. Once the types check out, the output can go straight into a backend config import endpoint.

## Troubleshooting Common Issues

### Garbled Chinese Characters After Conversion

Almost always an encoding problem. Excel on Windows saves GBK by default, while the tool processes input as UTF-8. Fix: save as "CSV UTF-8 (Comma delimited)" in Excel, or convert the encoding with a Python script:

```python
import pandas as pd
df = pd.read_csv("data.csv", encoding="gbk")
df.to_csv("data_utf8.csv", encoding="utf-8", index=False)
```

### Parsing Errors When Fields Contain Commas

Standard CSV wraps fields containing commas in quotes:

```csv
name,address
Alice,"Beijing, Chaoyang"
```

If the tool misparses this, check whether quoted fields are being handled correctly. Any decent tool supports RFC 4180, so this is rarely an issue.

### Leading Zeros Dropped from Numeric Fields

With type inference on, `"0086"` becomes the number `86` and the leading zeros are gone. For phone numbers, postal codes, ID numbers, and the like, turn off type inference or wrap those fields in quotes inside the CSV.

### Output Array Is Empty

Check whether the CSV has a header row. The tool treats the first row as column names by default; if the CSV has no header, add one manually or turn off the "first row is header" option in the tool.

## Converting CSV to JSON in Code

If CSV-to-JSON conversion is a fixed step in a workflow (cron jobs, automated imports, CI scripts), an online tool obviously isn't the right fit—write code instead. Here are implementations in two common languages.

### Node.js: The csv-parse Library

`csv-parse` is the most mature CSV parsing library in the Node.js ecosystem, with solid handling of quote escaping, line endings, and BOMs:

```javascript
const { parse } = require('csv-parse/sync');
const fs = require('fs');

const input = fs.readFileSync('data.csv', 'utf-8');
const records = parse(input, {
  columns: true,        // 第一行作为 key
  skip_empty_lines: true,
  cast: true,           // 自动类型推断
});
console.log(JSON.stringify(records, null, 2));
```

`cast: true` enables type inference—numeric fields become number, `true`/`false` become boolean. If you're dealing with a BOM-prefixed UTF-8 file exported from Excel, strip the BOM first with `input.replace(/^\uFEFF/, '')`.

### Python: The Standard Library csv Module

Python ships with a `csv` module—no extra dependencies needed:

```python
import csv, json

with open('data.csv', encoding='utf-8-sig') as f:  # utf-8-sig 处理 BOM
    reader = csv.DictReader(f)
    data = list(reader)

print(json.dumps(data, ensure_ascii=False, indent=2))
```

`encoding='utf-8-sig'` automatically strips the BOM at the start of the file, fixing the invisible-character-in-first-column-name problem with Excel exports. `ensure_ascii=False` ensures Chinese text is output as-is rather than escaped to `\uXXXX`.

Note: every field read by `csv.DictReader` is a string. If you need type inference, loop over the values and convert them yourself, or switch to pandas' `read_csv` paired with `to_json`.

### Online Tool vs Code

| Scenario | Recommended Approach |
|------|----------|
| One-off data conversion | Online tool |
| Self-service for non-technical teammates | Online tool |
| Quickly validating CSV structure | Online tool |
| Cron jobs, automated pipelines | Code |
| Conversion logic needs version control | Code |
| Very large datasets (tens of MB or more) | Code (streaming) |

## Typical Use Cases

### Format Preprocessing Before Data Analysis

A product manager or operations teammate organizes data in Excel, exports CSV, and needs to feed it to a backend API or analysis script. Converting it to a JSON array with the online tool and pasting it into Postman or your script's test data is far faster than hand-writing JSON, and far less prone to formatting mistakes.

### Preparing Frontend Mock Data

Test data usually lives in Excel spreadsheets. Once QA or a developer fills it in, it needs to become JavaScript objects for frontend mocks. Paste the CSV into the tool, assign the resulting JSON array to a variable, and the shape matches exactly what the frontend expects—no manual quoting and bracketing.

### Database Exports for Frontend Consumption

CSV is the most universal intermediate format exported by database tools like Navicat, DBeaver, and TablePlus. Run the export through this tool to get JSON you can import straight into MongoDB, use as test data for API responses, or turn into seed files for initialization. With type inference on, numeric and boolean fields are restored to the correct types automatically—no manual cleanup needed.

## Summary

The [CSV to JSON online converter](https://anyfreetools.com/tools/csv-to-json) covers the main day-to-day data conversion scenarios:

- **Zero-config conversion**: paste CSV, get JSON in one click
- **Flexible delimiter support**: handles commas, tabs, semicolons, and more
- **Type inference**: numbers and booleans recognized automatically, less post-processing
- **Multiple output formats**: array, key-value, pretty-printed or minified—switch freely

Next time you need to turn Excel data or a database export into JSON, just open [anyfreetools.com](https://anyfreetools.com/tools/csv-to-json) and you're done.
