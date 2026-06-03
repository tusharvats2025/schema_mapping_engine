"""
Schema Mapping Engine — Flask API
Endpoints: /sales/map  /ecommerce/map  /finance/map  /logistics/map  /hr/map
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import io

from engine.core import (
    ingest_file, build_normalised_index,
    map_schema, apply_mapping, confidence_label
)
from engine.domains import DOMAINS

app = Flask(__name__)
CORS(app)

# Pre-build normalised alias indexes at startup
NORMALISED_INDEXES = {
    domain: build_normalised_index(cfg["aliases"])
    for domain, cfg in DOMAINS.items()
}

ALLOWED_EXTENSIONS = {"csv", "xls", "xlsx", "xlsm", "tsv"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def build_map_endpoint(domain: str):
    """Factory — builds a map endpoint for a given domain."""

    def map_endpoint():
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files["file"]
        if not file.filename or not allowed_file(file.filename):
            return jsonify({
                "error": f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            }), 400

        try:
            file_bytes = file.read()
            df = ingest_file(file_bytes, file.filename)
        except Exception as e:
            return jsonify({"error": f"Could not parse file: {str(e)}"}), 422

        cfg              = DOMAINS[domain]
        schema           = cfg["schema"]
        normalised_alias = NORMALISED_INDEXES[domain]

        mapping = map_schema(list(df.columns), schema, normalised_alias)

        # Annotate each mapping with confidence label and required flag
        for r in mapping:
            r["confidence_label"] = confidence_label(r)
            r["required"] = schema.get(r["mapped"] or "", {}).get("required", False)

        # Build clean dataframe
        clean_df = apply_mapping(df, mapping)

        # PII masking for HR domain
        if domain == "hr":
            for col in clean_df.columns:
                if schema.get(col, {}).get("pii"):
                    if col == "aadhar_no":
                        clean_df[col] = "REDACTED"
                    else:
                        clean_df[col] = clean_df[col].astype(str).apply(
                            lambda v: "****" + v[-4:] if len(v) >= 4 else "****"
                        )

        # Stats
        resolved   = [r for r in mapping if r["mapped"]]
        unresolved = [r for r in mapping if not r["mapped"]]
        fuzzy_hits = [r for r in mapping if r["method"] == "fuzzy"]
        required_fields   = [k for k, v in schema.items() if v.get("required")]
        missing_required  = [f for f in required_fields if f not in clean_df.columns]

        # Without-layer check
        without_missing = [f for f in required_fields if f not in df.columns]

        # Output format: match input file format
        output_fmt = file.filename.rsplit(".", 1)[-1].lower()
        if output_fmt == "csv" or output_fmt == "tsv":
            out_buf = io.StringIO()
            clean_df.to_csv(out_buf, index=False)
            download_data = out_buf.getvalue()
            download_mime = "text/csv"
            download_name = f"mapped_{file.filename.rsplit('.', 1)[0]}.csv"
        else:
            out_buf = io.BytesIO()
            clean_df.to_excel(out_buf, index=False)
            download_data = out_buf.getvalue().hex()
            download_mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            download_name = f"mapped_{file.filename.rsplit('.', 1)[0]}.xlsx"

        return jsonify({
            "domain":        domain,
            "domain_label":  cfg["label"],
            "input_columns": list(df.columns),
            "mapping":       mapping,
            "stats": {
                "total_input":        len(df.columns),
                "mapped":             len(resolved),
                "unresolved":         len(unresolved),
                "fuzzy_resolved":     len(fuzzy_hits),
                "coverage_pct":       round(len(resolved) / len(df.columns) * 100, 1),
                "missing_required":   missing_required,
                "without_layer_fail": len(without_missing),
                "with_layer_fail":    len(missing_required),
            },
            "preview":       clean_df.head(5).to_dict(orient="records"),
            "download": {
                "data":     download_data if output_fmt == "csv" else None,
                "mime":     download_mime,
                "filename": download_name,
                "format":   output_fmt,
            }
        })

    map_endpoint.__name__ = f"map_{domain}"
    return map_endpoint


# ── Register endpoints ─────────────────────────────────────────────────────────
for _domain in DOMAINS:
    app.add_url_rule(
        f"/{_domain}/map",
        view_func=build_map_endpoint(_domain),
        methods=["POST"]
    )

# ── Health + domains list ──────────────────────────────────────────────────────
@app.route("/health")
def health():
    return jsonify({"status": "ok", "domains": list(DOMAINS.keys())})

@app.route("/domains")
def domains():
    return jsonify([
        {"id": k, "label": v["label"], "endpoint": f"/{k}/map",
         "fields": len(v["schema"]),
         "aliases": sum(len(a) for a in v["aliases"].values())}
        for k, v in DOMAINS.items()
    ])


if __name__ == "__main__":
    app.run(debug=True, port=5000)