---
layout: post
title: "NVIDIA Kumo - Foundation Models for Structured Data"
seo_title: "NVIDIA Kumo: Foundation Models for Relational, Tabular and Time-Series Data"
date: 2026-10-30
# last_modified_at: YYYY-MM-DD  # optional; JSON-LD dateModified falls back to `date`
author: Trisham Bharat Patil
category: "Artificial Intelligence"
excerpt: "NVIDIA Kumo brings foundation models to structured data. Relational, tabular, forecasting and anomaly models, plus engine libraries to train, customize, evaluate and deploy them."
meta: "NVIDIA • Kumo • Structured Data • Foundation Models"
description: "NVIDIA Kumo brings foundation models to structured data: relational, tabular and time-series models for forecasting, risk scoring, anomaly detection and more."
keywords: "NVIDIA Kumo, Kumo foundation models, foundation models for structured data, relational foundation model, tabular foundation model, time series forecasting, anomaly detection, risk scoring, predictive AI, enterprise AI"
search_intent: informational
tags:
  - NVIDIA
  - Kumo
  - Structured Data
  - Foundation Models
og_type: article
robots: "index, follow"
structured_data: BlogPosting
image: /assets/blogs/nvidia-kumo-foundation-models-structured-data/hero.png
published: true
---

<!--
  SEO
    Primary keyword:   NVIDIA Kumo
    Secondary:         Kumo foundation models, foundation models for structured
                       data, relational foundation model, tabular foundation
                       model, time series forecasting, anomaly detection, risk
                       scoring, predictive AI, enterprise AI
    Slug:              nvidia-kumo-foundation-models-structured-data
    Search intent:     informational

  CONTENT
    Body is author-supplied text only; add sections only when the author supplies them.
    Hero: author-supplied diagram (Structured Data -> NVIDIA Kumo [Kumo
    Structured Models + Kumo Engine Libraries] -> AI Predictions).
    Before publishing the body: make sure it puts "NVIDIA Kumo" in the first
    100 words and in at least one H2. Trim keywords/description if the body
    doesn't back them up.
-->

![NVIDIA Kumo foundation models for structured data: relational, tabular and time-series data flow through Kumo Structured Models and Kumo Engine Libraries into forecasts, risk scores, anomaly detection and recommended actions](/assets/blogs/nvidia-kumo-foundation-models-structured-data/hero.png)

NVIDIA Kumo is a family of open models, libraries, and tools for making predictions from tabular, relational, and time-series data. Kumo can be used to forecast outcomes, score risk, detect anomalies, and generate recommendations—without building and maintaining a separate machine learning model for every task.

As part of the NVIDIA [Agent Knowledge Foundation](https://developer.nvidia.com/topic/ai/agent-knowledge-foundation?size=n_12_n&sort-field=sort_key&sort-direction=asc)—open models and libraries for grounding agents in enterprise data—NVIDIA Kumo handles predictions such as forecasting outcomes, scoring risk, detecting anomalies, and recommending actions. Traditional predictive machine learning requires teams to prepare data, engineer features, train and tune a model, and build a deployment pipeline for each task. Kumo moves much of this repeated work into reusable foundation models purpose-built for structured data.

## Preparing Data for NVIDIA Kumo: From PDFs and CSVs to Structured Tables

Building an end-to-end data pipeline that extracts tables from unstructured sources (PDFs and CSVs), applies data engineering using DLT (Data Load Tool) with schema contracts, lands the data in a warehouse (like DuckDB), and feeds it into NVIDIA Kumo Structured Models for predictive analytics involves four primary stages.

### Step 1: Document Extraction (PDF & CSV to DataFrames)

First, ingest raw files. Use pdfplumber for tabular data extraction inside PDFs and pandas for standard CSV processing.

```python
import dlt
import pandas as pd
import pdfplumber


def extract_csv(file_path: str) -> pd.DataFrame:
  """Reads a CSV file into a Pandas DataFrame."""
  return pd.read_csv(file_path)


def extract_tables_from_pdf(file_path: str) -> pd.DataFrame:
  """Extracts tabular data from all pages of a PDF document."""
  all_tables = []
  with pdfplumber.open(file_path) as pdf:
    for page in pdf.pages:
      tables = page.extract_tables()
      for table in tables:
        if table and len(table) > 1:
          # Use first row as headers, remaining as data rows
          df_table = pd.DataFrame(table[1:], columns=table[0])
          all_tables.append(df_table)

  if all_tables:
    return pd.concat(all_tables, ignore_index=True)
  return pd.DataFrame()
```

### Step 2: DLT Pipeline with Schema Contracts

DLT (Data Load Tool) automatically infers schemas and loads data into your destination warehouse. By configuring schema contracts (e.g., freezing table structures or handling schema evolution rules like rejecting unexpected columns), you ensure data quality before it hits analytics or machine learning models.

```python
@dlt.resource(
    name="document_features",
    write_disposition="append",
    schema_contract={
        "tables": "freeze",  # Prevent unexpected new tables
        "columns": "evolve",  # Allow safe column evolution or set to "freeze" to block changes
    },
)
def process_documents(file_paths):
  """Generator that yields records from CSV and PDF files for DLT loading."""
  for path in file_paths:
    if path.endswith(".csv"):
      df = extract_csv(path)
    elif path.endswith(".pdf"):
      df = extract_tables_from_pdf(path)
    else:
      continue

    # Clean data frame columns (strip whitespaces, lowercase)
    df.columns = [
        c.strip().lower().replace(" ", "_") for c in df.columns
    ]

    # Yield records row-by-row as dictionaries
    for _, row in df.iterrows():
      yield row.to_dict()


def run_dlt_warehouse_pipeline(file_paths):
  """Runs the DLT pipeline targeting a local DuckDB warehouse."""
  pipeline = dlt.pipeline(
      pipeline_name="kumo_ingestion_pipeline",
      destination="duckdb",
      dataset_name="analytics_warehouse",
  )

  load_info = pipeline.run(process_documents(file_paths))
  print(load_info)
  return pipeline
```

### Step 3: Querying the Warehouse into Pandas

Once DLT populates the warehouse (DuckDB in this example), query the clean, validated data directly back into a Pandas DataFrame for downstream consumption.

```python
def load_warehouse_data_to_pandas(pipeline) -> pd.DataFrame:
  """Queries the DuckDB warehouse to retrieve clean data into a Pandas DataFrame."""
  with pipeline.sql_client() as client:
    with client.execute_query(
        "SELECT * FROM analytics_warehouse.document_features"
    ) as cursor:
      df_clean = cursor.df()
  return df_clean
```

### Step 4: Sending Data to NVIDIA Kumo Models

With your processed DataFrame ready, you can interface with NVIDIA Kumo models (either locally via Structured Data Models or through a deployed Kumo Relational NIM using the Kumo SDK).

```python
# Import NVIDIA Kumo SDK components (e.g., sdm_client or kumoai)
from sdm_client import Schema, SDMClient


def send_data_to_kumo_model(df: pd.DataFrame):
  """Prepares and sends the Pandas DataFrame to an NVIDIA Kumo model for predictions."""
  # 1. Map DataFrame to a Kumo Schema definition
  schema = Schema.from_data({"document_features": df})

  # Optionally define table primary keys or semantic types if required
  # schema["document_features"].primary_key = "id"

  # 2. Connect to the Kumo inference endpoint (e.g., local NVIDIA NIM container)
  client = SDMClient(url="http://localhost:8000")

  # 3. Check endpoint health and capabilities
  if client.health_ready():
    print("NVIDIA Kumo NIM endpoint is ready.")

  # 4. Construct your request or batch inference execution
  # Example target prediction using Kumo Tabular / Relational workflows:
  # request = Request(context=df, predict=df_inference, target="target_column", task="classification")
  # results = client.predict(request, model="kumo-tabular")
  # df_predictions = results.to_pandas()

  return schema
```

### Complete Execution Flow

Tie all the components together sequentially in your main script:

```python
if __name__ == "__main__":
  # 1. Define input files (PDFs and CSVs)
  files_to_process = ["data/financial_report.pdf", "data/metrics.csv"]

  # 2. Run ingestion, extraction, schema enforcement, and load into DuckDB warehouse
  pipeline_instance = run_dlt_warehouse_pipeline(files_to_process)

  # 3. Pull clean, engineered data back into a Pandas DataFrame from the warehouse
  analytic_df = load_warehouse_data_to_pandas(pipeline_instance)
  print(f"Loaded {len(analytic_df)} rows from warehouse into Pandas.")

  # 4. Pass the DataFrame to NVIDIA Kumo Models for predictive analysis
  kumo_schema = send_data_to_kumo_model(analytic_df)
  print("Data successfully formatted and structured for NVIDIA Kumo models.")
```
