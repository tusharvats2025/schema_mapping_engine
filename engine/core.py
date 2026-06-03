"""
Schema Mapping Engine - Core
Extracted from Notebooks 01-05
"""

from fuzzywuzzy import fuzz
import pandas as pd
import io


# --- Normalisation ----------------------------------------------------
def normalise(col: str) -> str:
    return col.stript().lower().replace(" ", "_").replace("-", "_")

# --- File Integration (CSV / XLS / XLSX)
def ingest_file(file_bytes: bytes, filename: str) -> pd.DataFrame:
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "csv":
        return pd.read_csv(io.BytesIO(file_bytes))
    elif ext in ("xls",):
        return pd.read_excel(io.BytesIO(file_bytes), engine="xlrd")
    elif ext in ("xlsx", "xlsm"):
        return pd.read_excel(io.BytesIO(file_bytes), engine="openpyxl")
    elif ext == "tsv":
        return pd.read_csv(io.BytesIO(file_bytes), sep="\t")
    else:
        # try CSV as fallback
        return pd.read_csv(io.BytesIO(file_bytes))
    

# -------- Mapper ----------------------------
def build_normalised_index(alias_library: dict) -> dict:
    return {
        canonical: [normalise(a) for a in aliases]
        for canonical, aliases in alias_library.items()
    }


def map_column(input_col: str, canonical_schema: dict, normalised_alias: dict, threshold: int = 70) -> dict:
    norm = normalise(input_col)

    if norm in canonical_schema:
        return {"input": input_col, "mapped": norm, "confidence": 100, "method": "exact_canonical"}
    
    for canonical, aliases in normalised_alias.items():
        if norm in aliases:
            return {"input": input_col, "mapped": canonical, "confidence": 95, "method": "exact_alias"}
        
        best_match, best_score = None, 0
        for canonical, norm_aliases in normalised_alias.items():
            for candidates in [canonical] + norm_aliases:
                score = fuzz.ratio(norm, candidates)
                if score > best_score:
                    best_score = score
                    best_match = canonical
        
        if best_score >= threshold:
            return {"input": input_col, "mapped": best_match, "confidence": best_score, "method": "fuzzy"}
    return {"input": input_col, "mapped": None, "confidence": best_score, "method": "unresolved"}


def map_schema(columns: list, canonical_schema: dict, normalised_alias: dict, threshold: int = 70) -> list:
    results = [map_column(col, canonical_schema, normalised_alias, threshold) for col in columns]
    seen, deduped = set(), []
    for r in results:
        if r["mapped"] is None or r["mapped"] not in seen:
            deduped.append(r)
            if r["mapped"]:
                seen.add(r["mapped"])
            else:
                deduped.append({**r, "mapped": None, "method": "unresolved", "confidence": 0})
    return deduped

def apply_mapping(df: pd.DataFrame, mapping: list) -> pd.DataFrame:
    resolved   = [r for r in mapping if r["mapped"] is not None]
    rename_map = {r["input"]: r["mapped"] for r in resolved}
    cols = [r["input"] for r in resolved]
    return df[cols].rename(columns=rename_map)


def confidence_label(row: dict) -> str:
    if row["method"] == "unresolved":
        return "unresolved"
    if row["confidence"] >= 90:
        return "high"
    return "medium"
