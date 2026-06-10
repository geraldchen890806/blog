---
author: Gerald Chen
pubDatetime: 2026-04-14T14:00:00+08:00
title: "Tool Guide 27: Online Mock Data Generator"
slug: blog123_mock-data-guide
featured: false
draft: true
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - 前端
description: "A free online mock data generator covering six data types — person, company, address, internet, finance, and product — that produces test data in JSON or CSV with a single click, no dependencies to install."
---

The API isn't ready, the backend is still in progress, and the test database is empty — every developer has been there. Making up test data by hand is tedious, and it tends to produce suspiciously uniform results (raise your hand if everything is "John Doe" and "test@test.com").

This post introduces the [Mock Data Generator](https://anyfreetools.com/tools/mock-data) on anyfreetools.com. Open it in a browser and you can generate structured fake data in bulk, with 6 data types and 2 output formats.

## Why You Need Mock Data

In real-world development, the need for mock data spans the entire development cycle:

**Parallel frontend/backend development**: The frontend doesn't have to wait for backend APIs — use mock data to get pages and interactions working first. On a team, this significantly cuts down blocking time.

**UI edge-case testing**: Real data varies wildly in length and format. A username might be 2 characters or a 20-character English name. A price might be 0.01 or 999999.99. If you only test with fixed data, broken layouts in production are just a matter of time.

**Database seeding**: Demo and load-testing environments need data in bulk. Inserting 10 rows by hand is tolerable; 1000 is not.

**Unit and integration tests**: Test cases need repeatable, diverse input data. Hardcoded test data leads to narrow coverage and high maintenance cost.

The traditional approach is to install a library like Faker.js in your project. But sometimes you just need a quick batch of data to fill a Postman request or a database table, and setting up a Node.js environment for that isn't worth it. An online tool is more efficient in those cases.

## Supported Data Types

The tool is built on Faker.js and supports 6 data types, each generating a set of related fields.

### Person

Generates complete personal profile data:

```json
{
  "id": "a3f2b1c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c",
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice.johnson@example.com",
  "phone": "555-0123",
  "birthDate": "1995-03-15",
  "address": "742 Evergreen Terrace",
  "city": "Springfield",
  "country": "United States"
}
```

Includes UUID, name, email, phone, birth date, address, city, and country. Great for testing user management systems, contact lists, CRMs, and similar applications.

### Company

Generates company-related data:

```json
{
  "id": "b4c5d6e7-8f9a-0b1c-2d3e-4f5a6b7c8d9e",
  "name": "Acme Technologies",
  "industry": "infrastructure",
  "employees": 3500,
  "founded": 2008,
  "website": "https://acme-tech.example.com",
  "email": "contact@acme-tech.example.com"
}
```

Includes company name, industry, employee count, founding year, website, and contact email. Useful for B2B platforms, company directories, and the like.

### Address

Generates complete addresses with latitude and longitude:

```json
{
  "id": "c5d6e7f8-9a0b-1c2d-3e4f-5a6b7c8d9e0f",
  "street": "456 Oak Avenue",
  "city": "Portland",
  "state": "Oregon",
  "zipCode": "97201",
  "country": "United States",
  "latitude": 45.5231,
  "longitude": -122.6765
}
```

Ideal for logistics systems, map applications, delivery services, or anything that needs geographic data.

### Internet

Generates data related to online accounts:

```json
{
  "id": "d6e7f8a9-0b1c-2d3e-4f5a-6b7c8d9e0f1a",
  "email": "john_doe42@example.com",
  "username": "john_doe42",
  "password": "xK9#mP2vLq",
  "url": "https://example-site.com",
  "ipv4": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
}
```

Includes email, username, password, URL, IPv4 address, and User-Agent. Good for security testing, user systems, and log analysis.

### Finance

Generates financial transaction data:

```json
{
  "id": "e7f8a9b0-1c2d-3e4f-5a6b-7c8d9e0f1a2b",
  "accountNumber": "12345678",
  "iban": "DE89370400440532013000",
  "creditCard": "4111-1111-1111-1111",
  "currency": "USD",
  "amount": "1234.56",
  "transactionType": "payment"
}
```

Includes account number, IBAN, credit card number (fake, for testing only), currency code, amount, and transaction type. Suited to developing and testing payment systems, financial software, and banking apps.

### Product

Generates e-commerce product data:

```json
{
  "id": "f8a9b0c1-2d3e-4f5a-6b7c-8d9e0f1a2b3c",
  "name": "Ergonomic Cotton Chair",
  "description": "The slim & simple design...",
  "price": "299.00",
  "category": "Furniture",
  "color": "azure",
  "material": "Cotton"
}
```

Includes product name, description, price, category, color, and material. Useful for e-commerce platforms, inventory management, and product listing pages.

## Output Formats

The tool supports two output formats:

### JSON

The default output format — a standard JSON array. Paste it straight into the request body of an API testing tool (Postman, Insomnia) or use it as a frontend mock data source:

```typescript
// 将生成的 JSON 直接用作 Mock 数据
const mockUsers = [
  {
    "id": "a3f2b1c4-...",
    "firstName": "Alice",
    // ...
  }
];

// 模拟 API 响应
function getMockUsers() {
  return new Promise(resolve => {
    setTimeout(() => resolve(mockUsers), 300);
  });
}
```

### CSV

Comma-separated tabular output with field names in the first row (the header). Good for importing into databases, Excel, or other data processing tools:

```csv
id,firstName,lastName,email,phone,birthDate,address,city,country
"a3f2b1c4-...","Alice","Johnson","alice@example.com","555-0123","1995-03-15","742 Evergreen Terrace","Springfield","United States"
```

CSV is especially handy for bulk-loading a test database. Most database management tools (DBeaver, DataGrip) support direct CSV import.

## Real-World Scenarios

### Scenario 1: Building a Frontend List Page

You're building a user management dashboard that needs to display a user list. The API isn't ready, so use mock data to get pagination, search, and sorting working first:

1. Open the [Mock Data Generator](https://anyfreetools.com/tools/mock-data)
2. Select the "Person" type
3. Set the count to 50
4. Choose JSON as the format
5. Click generate and copy the result into `mock/users.json` in your project

```typescript
// src/mock/api.ts
import users from "./users.json";

export function fetchUsers(page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return {
    data: users.slice(start, start + pageSize),
    total: users.length,
  };
}
```

Frontend development is now fully decoupled from backend progress — when it's time to integrate, just swap the mock data source for the real API.

### Scenario 2: Seeding a Database for Load Testing

You need a large batch of order data in the test environment:

1. Select the "Product" type and generate 1000 rows of CSV data
2. Import it with a database tool

```sql
-- MySQL 导入 CSV
LOAD DATA INFILE '/tmp/products.csv'
INTO TABLE products
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
```

### Scenario 3: API Testing in Postman

Testing an API endpoint that creates a company:

1. Select the "Company" type and generate 1 JSON record
2. Copy it into the Postman request body
3. Make minor adjustments to match the API's field requirements and send the request

This gets you much closer to the distribution of real data than hand-rolling something like `{"name": "Test Co", "industry": "test industry"}`.

## Compared to In-Codebase Solutions

If your project already has a full mock setup, what's the point of an online tool?

**The online tool is a good fit when**:
- You need a one-off batch of data and don't want to add a dependency to the project
- Non-engineers (product, QA) need to prepare test data
- You want to quickly validate a UI layout and see results within seconds
- You're seeding a database and can export CSV for direct import

**An in-codebase solution is a good fit when**:
- You need integration with the project's test framework
- Data fields carry custom business logic
- You need repeatable, seed-based data
- Data generation needs to be automated in a CI/CD pipeline

The two don't conflict. The online tool solves the immediate "give me a batch of data right now" need; the in-codebase approach solves engineering-grade, repeatable test data management.

## Tips

**Pick a sensible data volume**: 20-50 rows is usually enough for UI testing; performance testing may need 500-1000. Don't generate too much at once — rendering large amounts of text slows the browser down.

**Combine multiple types**: An e-commerce project may need user data, product data, and address data at the same time. Generate them separately, then link them with a script (e.g., randomly assign a user ID and product ID to each order).

**Check the encoding before importing CSV into a database**: The generated CSV is UTF-8. If your target database uses a different encoding (such as GBK), convert it before importing, or non-ASCII fields will come out garbled.

**Use the JSON output for API mocking**: Combined with a tool like json-server, you can stand up a full RESTful mock API in minutes:

```bash
# 安装 json-server
npm install -g json-server

# 用生成的 JSON 文件启动 Mock 服务
json-server --watch mock-users.json --port 3001
```

Your frontend can then request `http://localhost:3001/users` to get mock data, with pagination, sorting, and filtering supported out of the box.

---

**Related reading**:
- [Tool Guide #2: Online JSON Formatter](/en/posts/blog085_json-formatter-guide/) - View and edit the generated JSON with a formatter
- [Tool Guide 23: Free Online CSV to JSON Converter](/en/posts/blog116_csv-to-json-guide/) - Convert between CSV and JSON

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
- [Tool Guide 26: Online Subnet Calculator](/en/posts/blog121_subnet-calculator-guide/)
