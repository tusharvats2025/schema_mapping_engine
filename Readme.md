<div align="center">

<img src="https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
<img src="https://img.shields.io/badge/Flask-3.0-000000?style=for-the-badge&logo=flask&logoColor=white"/>
<img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
<img src="https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white"/>
<img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge"/>

<br/><br/>

# 🧠 Schema Mapping Engine

**A domain-aware middleware layer that normalises messy user-uploaded data into structured, agent-ready schemas.**

*Sits between your users' chaotic CSVs and the clean input your AI agent or backend service expects.*

[**Notebooks**](#-research-notebooks) • [**Quick Start**](#-quick-start) • [**API Docs**](#-api-usage) • [**Integrations**](#-nodejs-integration)

</div>

---

## 🔥 The Problem

```
User uploads →  "Cust ID"   "total_sales"   "opp_stage"   "rep_name"
Agent expects → "customer_id"  "revenue"    "deal_stage"  "sales_rep"

Result: Silent mismatch. Wrong outputs. Zero error thrown.
```

This engine fixes that — automatically, across 5 business domains.

---

## ⚡ Why Python — not TypeScript or Java

Rule-based matching (v1) could run anywhere. **But the engine is built to evolve:**

| Version | Capability | Key Library | TS/Java? |
|---|---|---|---|
| **v1** *(this repo)* | Rule-based alias + fuzzy matching | `fuzzywuzzy` · `rapidfuzz` | ✅ possible |
| **v2** *(next)* | Semantic embedding similarity | `sentence-transformers` | ❌ no equivalent |
| **v3** *(planned)* | Classification model on real client data | `scikit-learn` · `pandas` | ❌ no equivalent |

> **Building in Python now = no rewrite at v2.**
> Node.js and Spring Boot projects consume this via HTTP — they call the Flask REST API. Zero Python knowledge required on the client side.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Uploads                              │
│         CSV  ·  XLS  ·  XLSX  ·  XLSM  ·  TSV              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Flask REST API                              │
│   /sales/map  /ecommerce/map  /finance/map                  │
│   /logistics/map  /hr/map                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               Mapping Engine (Python)                        │
│                                                             │
│  Stage 1 → Exact alias lookup    (deterministic, O(1))      │
│  Stage 2 → Fuzzy token similarity (fallback, threshold=70)  │
│                                                             │
│  + Domain alias libraries  (820+ curated variants)          │
│  + Post-mapping validation (enum · arithmetic · temporal)   │
│  + PII masking             (HR domain)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           Clean JSON + Mapped File (original format)        │
│      consumed by: Node.js · Spring Boot · Any HTTP client   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Domains & Endpoints

| Domain | Endpoint | Fields | Aliases | Unique Validation |
|---|---|---|---|---|
| 💼 Sales / CRM | `POST /sales/map` | 13 | 155+ | — |
| 🛒 E-commerce / Orders | `POST /ecommerce/map` | 17 | 167+ | Enum · Arithmetic · Temporal |
| 🧾 Finance / Invoicing | `POST /finance/map` | 17 | 146+ | Tax · Total · Due date · Currency |
| 🚚 Delivery / Logistics | `POST /logistics/map` | 22 | 166+ | SLA breach · GPS range · Status progression |
| 👤 HR / Payroll | `POST /hr/map` | 23 | 186+ | Salary · Age · Payroll period · PII masking |

---

## 🚀 Quick Start

### Option 1 — Local

```bash
# Clone
git clone https://github.com/tusharvats2025/schema_mapping_engine
cd schema-mapping-engine

# Install dependencies
pip install -r requirements.txt

# Start API
python flask_app/app.py
# ✅  http://localhost:5000

# Start frontend (separate terminal)
cd frontend
npm install && npm run dev
# ✅  http://localhost:5173
```

### Option 2 — Docker

```bash
docker build -t schema-mapping-engine .
docker run -p 5000:5000 schema-mapping-engine
# ✅  http://localhost:5000
```

---

## 📡 API Usage

### Health check

```bash
curl http://localhost:5000/health
# { "status": "ok", "domains": ["sales","ecommerce","finance","logistics","hr"] }
```

### List all domains

```bash
curl http://localhost:5000/domains
```

### Map a file

```bash
curl -X POST http://localhost:5000/sales/map \
  -F "file=@your_messy_data.csv"
```

> Accepts: `.csv` · `.xls` · `.xlsx` · `.xlsm` · `.tsv`
> Returns: mapped JSON + download-ready clean file in original format

### Response structure

```json
{
  "domain": "sales",
  "domain_label": "Sales / CRM",
  "mapping": [
    { "input": "Cust ID",     "mapped": "customer_id", "confidence": 95, "method": "exact_alias",  "confidence_label": "high" },
    { "input": "total_sales", "mapped": "revenue",     "confidence": 95, "method": "exact_alias",  "confidence_label": "high" },
    { "input": "inv_value",   "mapped": "revenue",     "confidence": 78, "method": "fuzzy",        "confidence_label": "medium" },
    { "input": "notes_col",   "mapped": null,           "confidence": 31, "method": "unresolved",   "confidence_label": "unresolved" }
  ],
  "stats": {
    "total_input": 15,
    "mapped": 13,
    "fuzzy_resolved": 2,
    "coverage_pct": 86.7,
    "missing_required": [],
    "without_layer_fail": 5,
    "with_layer_fail": 0
  },
  "preview": [ {...}, {...} ]
}
```

---

## 🟢 Node.js Integration

> ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white) ![Axios](https://img.shields.io/badge/axios-5A29E4?style=flat&logo=axios&logoColor=white)

```javascript
const FormData = require('form-data');
const fs       = require('fs');
const axios    = require('axios');

async function mapSchema(filePath, domain = 'sales') {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  const { data } = await axios.post(
    `http://localhost:5000/${domain}/map`,
    form,
    { headers: form.getHeaders() }
  );

  const renameMap = data.mapping
    .filter(m => m.mapped)
    .reduce((acc, m) => ({ ...acc, [m.input]: m.mapped }), {});

  console.log(`Coverage: ${data.stats.coverage_pct}%`);
  console.log(`Without layer: ${data.stats.without_layer_fail} field failures`);
  console.log(`With layer:    ${data.stats.with_layer_fail} field failures`);

  return renameMap;
}
```

---

## ☕ Spring Boot Integration

> ![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=flat&logo=springboot&logoColor=white) ![Java](https://img.shields.io/badge/Java-ED8B00?style=flat&logo=openjdk&logoColor=white) ![Maven](https://img.shields.io/badge/Maven-C71A36?style=flat&logo=apachemaven&logoColor=white)

```java
// pom.xml: spring-boot-starter-web

@Service
public class SchemaMappingService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String API_BASE = "http://localhost:5000";

    public Map<String, Object> mapFile(String filePath, String domain) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new FileSystemResource(filePath));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        ResponseEntity<Map> response = restTemplate.postForEntity(
            API_BASE + "/" + domain + "/map",
            new HttpEntity<>(body, headers),
            Map.class
        );

        return response.getBody();
    }
}
```

---

## 🗂️ Project Structure

```
schema-mapping-engine/
│
├── 🐍 engine/
│   ├── core.py          # Mapper · normaliser · file ingestion
│   └── domains.py       # 5 domain schemas + 820+ alias variants
│
├── 🌐 flask_app/
│   └── app.py           # REST API — 5 domain endpoints
│
├── ⚛️  frontend/
│   └── src/App.jsx      # React demo UI
│
├── 📓 notebooks/        # Research notebooks 01–05
│
├── 🐳 Dockerfile
├── 📋 requirements.txt
└── 📖 README.md
```

---

## 🔍 Mapping Methods

| Method | Trigger | Confidence | |
|---|---|---|---|
| `exact_canonical` | Column name = canonical field name | **100** | 🟢 |
| `exact_alias` | Column name found in curated alias library | **95** | 🟢 |
| `fuzzy` | Token-sort ratio ≥ 70 (Stage 2 fallback) | **70–89** | 🟡 |
| `unresolved` | No confident match — flagged for human review | **—** | 🔴 |

---

## 🛠️ Tech Stack

<div align="center">

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Pandas](https://img.shields.io/badge/Pandas-150458?style=for-the-badge&logo=pandas&logoColor=white)
![NumPy](https://img.shields.io/badge/NumPy-013243?style=for-the-badge&logo=numpy&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Jupyter](https://img.shields.io/badge/Jupyter-F37626?style=for-the-badge&logo=jupyter&logoColor=white)

</div>

---

## 📓 Research Notebooks

Each domain has a full research-style Jupyter notebook with LaTeX problem formulations, alias coverage analysis, fuzzy stress-tests, and with/without layer comparisons.

| # | Domain | Key Nuance Added |
|---|---|---|
| 01 | 💼 Sales / CRM | Baseline — alias mapping + fuzzy stress-test + with/without comparison |
| 02 | 🛒 E-commerce | Platform aliases (Shopify · Amazon · Magento) + 3 post-mapping validation layers |
| 03 | 🧾 Finance | SAP · Oracle · Tally aliases + currency value-level normalisation |
| 04 | 🚚 Logistics | Carrier aliases (BlueDart · DHL · FedEx · Delhivery) + GPS validation + SLA breach |
| 05 | 👤 HR / Payroll | Multi-country regulatory aliases (India · US · UK) + PII masking + salary consistency |

---

## 📈 Roadmap

```
v1 ✅  Rule-based alias matching       (this repo)
         ↓
v2 🔜  Semantic embedding similarity   sentence-transformers + cosine distance
         ↓
v3 🔮  Classification model            trained on real client CSV data
```

The unified probabilistic ensemble across all three stages:

```
P(ĉ | c) = α · P_alias(ĉ|c) + β · P_embed(ĉ|c) + γ · P_classify(ĉ|c)

where α + β + γ = 1  (weights tuned per domain)
```

---

## 📄 License

MIT — use freely, attribution appreciated.

---

<div align="center">
  <sub>Built with 🐍 Python · researched in 📓 Jupyter · served via 🌐 Flask · demoed in ⚛️ React</sub>
</div>