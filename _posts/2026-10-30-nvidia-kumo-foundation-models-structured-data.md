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

## Customer Churn Prediction with NVIDIA Kumo Predictive Query Language (PQL)

To perform customer churn or classification tasks using NVIDIA Kumo, you write queries in **Predictive Query Language (PQL)**—a declarative, SQL-like language designed to specify future targets across connected relational data.

Instead of manually building flat feature tables or writing complex multi-table joins, PQL defines **what** to predict (the target, time horizon, and entity) while the Kumo engine handles the underlying graph feature discovery.

---

### Step 1: Formulating a Churn PQL Query

To predict customer churn, you typically look forward from a specific point in time to see if a customer drops a core behavior (such as placing zero orders or having zero activity logs over a future window).

#### 1. Transaction-Based Churn Query

This query predicts active customers who will stop transacting over the next **90 days** (i.e., zero orders in the future window) while restricting the target population to customers who were active in the prior 90 days:

```python
churn_pql_query = (
    "PREDICT NOT EXISTS(orders, *, 0, 90) "
    "FOR EACH customers.customer_id "
    "WHERE EXISTS(orders, *, -90, 0)"
)
```

* **`PREDICT NOT EXISTS(...)` / `COUNT(...) = 0`**: Determines if the future event window contains zero records.
* **`FOR EACH customers.customer_id`**: Defines the entity grain being evaluated.
* **`WHERE EXISTS(orders, *, -90, 0)`**: A trailing historical window filter ensuring you only score customers who were recently active (eliminating users who already churned long ago).

#### 2. Event-Based / Activity Churn Query

If your PDF/CSV data contains streaming, logins, or app interaction logs, you can target product disengagement (soft churn):

```python
activity_churn_query = (
    "PREDICT COUNT(events.* WHERE events.event_type = 'stream', 0, 30, days) = 0 "
    "FOR EACH users.user_id "
    "WHERE COUNT(events.*, -30, 0, days) > 0"
)
```

---

### Step 2: Executing PQL via the Kumo Python SDK

Once your database or warehouse data is mapped into a Kumo relational graph, you compile and run the PQL query using the Python SDK.

```python
from kumo_relational_client import RelationalClient
from kumoai.pquery import PredictiveQuery


def run_kumo_churn_prediction(graph, pql_text: str):
  """Validates and executes a PQL churn query against a Kumo Relational endpoint."""
  # 1. Initialize and validate the predictive query object
  query = PredictiveQuery(graph, pql_text)
  query.validate()

  print(f"Detected Task Type: {query.get_task_type()}")  # binary_classification

  # 2. Connect to the Kumo endpoint and run predictions
  with RelationalClient(url="http://localhost:8000") as client:
    # Run batch prediction for active entities using 'fast' mode
    result_df = client.relational(graph).predict(
        query=pql_text,
        run_mode="fast",
    )

  return result_df
```

---

### Step 3: Inspecting Classification Results

When you execute a classification or churn PQL query, Kumo returns a Pandas DataFrame containing the unique entity identifier alongside the model output:

* **`ENTITY`**: The specific customer or user ID evaluated.
* **`PREDICTION`**: The predicted probability score (or binary classification flag) indicating the likelihood of churn within your specified time window.

## NVIDIA Kumo Models: Relational, Tabular, Forecast and Anomaly

![NVIDIA Kumo models for structured data: Kumo Relational, Kumo Tabular, Kumo Forecast and Kumo Anomaly, with their capabilities and links to Hugging Face weights, NVIDIA NIM API, Kumo Structured Data Models and Kumo-TS](/assets/blogs/nvidia-kumo-foundation-models-structured-data/nvidia-kumo-relational-tabular-forecast-anomaly-models.png)

## How to Install and Use NVIDIA Kumo Engine

### 1. Installation Guide

Choose the appropriate installation command based on your data storage environment:

**Base Engine (Local CSV / Parquet Files / DuckDB):**

```bash
pip install kumo-engine
```

**With Cloud Object Storage Support (AWS S3 / GCS):**

```bash
pip install "kumo-engine[s3]"
# or for Google Cloud Storage
pip install "kumo-engine[gcs]"
```

**With Warehouse Integrations (Snowflake / Databricks / BigQuery):**

```bash
pip install "kumo-engine[snowflake]"
# or
pip install "kumo-engine[databricks]"
# or
pip install "kumo-engine[bigquery]"
```

### 2. End-to-End Pipeline Integration Guide (DLT + DuckDB + Kumo Engine)

This complete script integrates your DLT document extraction/schema contract pipeline directly into the NVIDIA Kumo Engine workflow using local storage/scratch directories:

```python
from pathlib import Path
import dlt
import pandas as pd
import pdfplumber
from kumo.engine import FileConnector, Graph, PredictiveQuery, Table, Trainer, configure
from kumoapi.model_plan import RunMode


# ==========================================
# STAGE 1 & 2: DLT Extraction & Warehouse Load
# ==========================================
def extract_tables_from_pdf(file_path: str) -> pd.DataFrame:
  all_tables = []
  with pdfplumber.open(file_path) as pdf:
    for page in pdf.pages:
      for table in page.extract_tables():
        if table and len(table) > 1:
          all_tables.append(pd.DataFrame(table[1:], columns=table[0]))
  return pd.concat(all_tables, ignore_index=True) if all_tables else pd.DataFrame()


@dlt.resource(
    name="document_features",
    write_disposition="append",
    schema_contract={"tables": "freeze", "columns": "evolve"},
)
def process_documents(file_paths):
  for path in file_paths:
    df = (
        pd.read_csv(path)
        if path.endswith(".csv")
        else extract_tables_from_pdf(path)
    )
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    for _, row in df.iterrows():
      yield row.to_dict()


def run_pipeline(file_paths):
  pipeline = dlt.pipeline(
      pipeline_name="kumo_ingestion_pipeline",
      destination="duckdb",
      dataset_name="analytics_warehouse",
  )
  pipeline.run(process_documents(file_paths))
  return pipeline


# ==========================================
# STAGE 3 & 4: Kumo Engine Setup & PQL Execution
# ==========================================
def train_and_predict_with_kumo(pipeline):
  # 1. Configure Kumo Engine scratch directory & backend execution
  configure(scratch_dir="./kumo_scratch")

  # 2. Extract clean validated data back to Pandas for Kumo graph creation
  with pipeline.sql_client() as client:
    with client.execute_query(
        "SELECT * FROM analytics_warehouse.document_features"
    ) as cursor:
      df_clean = cursor.df()

  # Save to a local staging file for FileConnector ingestion
  staging_path = Path("kumo_staged_data")
  staging_path.mkdir(exist_ok=True)
  df_clean.to_csv(staging_path / "document_features.csv", index=False)

  # 3. Setup Kumo Graph & Tables
  files = FileConnector(root_dir=str(staging_path.resolve()))
  documents_table = Table.from_source_table(
      files["document_features"], primary_key="document_id"
  )

  graph = Graph(tables=[documents_table])

  # 4. Define Predictive Query Language (PQL) task
  # Example: Classify whether a document flag/target occurs over a horizon
  pql_query = PredictiveQuery(
      graph=graph,
      query=(
          "PREDICT document_features.target_label = 1 "
          "FOR EACH document_features.document_id"
      ),
  )

  # 5. Train model and make predictions using Kumo Engine
  trainer = Trainer(graph=graph, query=pql_query)
  model = trainer.train(run_mode=RunMode.FAST)

  predictions = model.predict()
  print(predictions.to_pandas())
  return predictions


if __name__ == "__main__":
  # Run ingestion & Kumo pipeline
  files_to_process = ["data/report.pdf", "data/metrics.csv"]
  pipeline_instance = run_pipeline(files_to_process)
  train_and_predict_with_kumo(pipeline_instance)
```

## Advanced Training, GPU Allocation and Model Plan Configuration in NVIDIA Kumo Engine

In NVIDIA Kumo Engine, large-scale training optimization relies on configuring its high-performance Rust-based storage engine (DiskGraph), adjusting graph sampling depths, fine-tuning model plans, and ensuring your execution environment properly targets available NVIDIA GPUs.

### 1. GPU Allocation and Hardware Sizing

Kumo Engine offloads graph context generation and GNN (Graph Neural Network) batch processing to local hardware accelerators.

* **GPU Requirements:** Production datasets (such as multi-billion-node relational graphs) typically require a modern NVIDIA GPU (e.g., NVIDIA A10G, A100, or H100 with adequate VRAM). For example, standard enterprise benchmarks run efficiently on instances like an AWS g5.16xlarge equipped with an A10G GPU.
* **Local NVMe SSD Storage:** Kumo's DiskGraph indexes records and relationships directly on local high-speed NVMe SSDs rather than trying to fit entire multi-terabyte graphs into RAM. Configure your high-performance scratch directory to point directly to your local NVMe mount:

```python
from kumo.engine import configure

# Point the engine scratch directory to a local NVMe mount for fast disk-backed graph indexing
configure(scratch_dir="/mnt/local-ssd/kumo-scratch")
```

---

### 2. Configuring Model Plans and Sampling Depth

Model plans dictate how Kumo traverses relational edges, aggregates temporal history, and structures layers. You can adjust the configuration parameters to optimize performance versus accuracy on large datasets:

* **Sampling Depth (Hops):** Controls how deep the graph traversal goes when gathering historical context (e.g., looking at a customer → their orders → the items in those orders → product categories). Shallower depths (e.g., 2 hops) execute rapidly on massive scales, while deeper configurations (4+ hops) capture complex relational dynamics.
* **Run Modes:** Use `RunMode.FAST` for rapid baseline experimentation or tune to configuration objects for full-scale deep training runs.

```python
from kumo.engine import PredictiveQuery, Trainer
from kumoapi.model_plan import RunMode

# 1. Define your target predictive task
pql_query = PredictiveQuery(
    graph=graph,
    query=(
        "PREDICT NOT EXISTS(orders, *, 0, 90) "
        "FOR EACH customers.customer_id "
        "WHERE EXISTS(orders, *, -90, 0)"
    ),
)

# 2. Instantiate the Trainer
trainer = Trainer(graph=graph, query=pql_query)

# 3. Train using advanced configuration options and execution modes
# For deep production training on large scale datasets:
model = trainer.train(
    run_mode=RunMode.PRODUCTION,  # Switches to full optimization budget
    # Additional hyperparameters (such as batch size, epochs, or graph sampling limits)
    # can be adjusted via model plan templates or configuration overrides depending on schema scale.
)
```

---

### 3. Best Practices for Large Datasets

* **Parallel Ingestion:** When pulling large data from cloud data warehouses (Snowflake, Databricks, BigQuery) or cloud object stores (S3, GCS), ensure you use the corresponding connector extensions (`kumo-engine[snowflake]`, `kumo-engine[s3]`, etc.) so Kumo can ingest large partitions natively in parallel.
* **Temporal Windows:** Constrain your historical lookback windows (e.g., `-90, 0` days) in your PQL strings. Limiting windows prevents unbounded memory growth when traversing time-series event tables with billions of rows.

## Distributed Multi-GPU Training with NVIDIA Kumo Engine on Kubernetes

To configure NVIDIA Kumo Engine to distribute model training and scale across multiple NVIDIA GPUs in a cluster environment, you deploy Kumo using its native containerized architecture via Kubernetes (EKS, AKS, or GKE) alongside GPU node pools managed with Kumo-provided Helm charts or GitOps (Flux) configurations.

### 1. Cluster Prerequisites & Node Sizing

For enterprise-scale relational graph training across multi-GPU node environments, ensure your underlying cluster meets these hardware specifications:

* **NVIDIA Driver Version:** Ensure nodes run NVIDIA driver version 580.65.06 or later.
* **GPU Node Pools:** Provision dedicated GPU node instances (e.g., NVIDIA A100 or H100 nodes with high-speed NVMe local scratch storage for DiskGraph and fast internode interconnects like NVLink/InfiniBand).
* **State DB:** Ensure a provisioned PostgreSQL database is ready to track orchestrations, state, and job coordination across cluster pods.

---

### 2. Configuring GPU Requests in Kubernetes / Helm

Kumo Engine splits container services across pods for the API, data engine, state management, and model execution services. You allocate specific GPU limits and counts for your training jobs inside your deployment configurations or Helm `values.yaml`:

```yaml
# Example snippet for configuring GPU resource requests for Kumo Engine training pods
resources:
  limits:
    nvidia.com/gpu: "4" # Request 4 GPUs per training pod/worker node
  requests:
    nvidia.com/gpu: "4"
```

When deploying or scaling pods across multiple nodes, Kumo utilizes native orchestrators to distribute data preprocessing, graph message-passing steps, and GNN training iterations across the designated device arrays.

---

### 3. Submitting Distributed Training Jobs via Python API

Once your Kubernetes cluster and Kumo infrastructure services are running, your Python client orchestrates distributed training by connecting to your deployed Kumo control-plane endpoint:

```python
from kumo.engine import PredictiveQuery, Trainer, configure
from kumoapi.model_plan import RunMode

# 1. Point the client to your cluster's remote Kumo engine gateway URL
configure(
    endpoint="http://kumo-engine-service.internal-cluster:8000",
    scratch_dir="/mnt/local-nvme/kumo-scratch",
)

# 2. Define the PQL training query for your relational graph
pql_query = PredictiveQuery(
    graph=graph,
    query=(
        "PREDICT NOT EXISTS(orders, *, 0, 90) "
        "FOR EACH customers.customer_id "
        "WHERE EXISTS(orders, *, -90, 0)"
    ),
)

# 3. Initialize the Trainer targeting the cluster backend
trainer = Trainer(graph=graph, query=pql_query)

# 4. Trigger production training optimized for multi-GPU distribution
model = trainer.train(
    run_mode=RunMode.PRODUCTION,
    # Distributed options automatically scale across available cluster worker nodes
)

print("Distributed model training completed successfully.")
```

## NVIDIA Run:ai Time-Based Fairshare Scheduling for Kumo Training Queues

To configure NVIDIA Run:ai time-based fairshare scheduling for your Kumo Engine training queues in a shared multi-tenant cluster, you establish a setup that goes beyond point-in-time quota allocations. Time-based fairshare prevents heavy continuous training teams (like computer vision workflows) from starving bursty or on-demand pipelines (such as large-scale Kumo relational model training runs) by factoring in historical GPU-hour consumption over a sliding window.

### Step 1: Define Departments, Projects, and Node Pools

In the NVIDIA Run:ai platform UI or via custom resource definitions (CRDs), map your organization's structures into distinct projects associated with specific GPU node pools (e.g., your high-performance NVMe-backed node pool dedicated to Kumo graph indexing and training):

* **Guaranteed Quota (Deserved Quota):** Assign baseline hardware minimums (e.g., guaranteed GPUs required for standard operations or high-priority inference endpoints).
* **Over-Quota Weights:** Configure weights that govern how surplus idle resources are distributed when queues request compute beyond their deserved baseline.

---

### Step 2: Enable and Tune Time-Based Fairshare per Node Pool

Time-based fairshare operates within each priority tier on over-quota resource allocations. It dynamically adjusts effective queue weights based on past consumption so that teams who have waited longer or consumed fewer resources receive priority for burst capacity.

Configure time-based fairshare on your node pool via the Run:ai platform control plane or by updating the underlying KAI Scheduler configurations:

```yaml
apiVersion: run.ai/v1
kind: NodePoolConfiguration
metadata:
  name: kumo-gpu-nodepool
spec:
  fairshare:
    enabled: true
    mode: "time-based" # Activates historical usage tracking
    window: "168h"     # Lookback window for historical consumption (e.g., 1 week)
    kValue: 2.0        # Correction aggressiveness factor for historical imbalance
```

* **Sliding Window (`window`):** Defines the historical period (default is typically 1 week / 168h) over which GPU-hour consumption is accumulated.
* **Correction Factor (`kValue`):** Determines how rapidly the scheduler penalizes or re-balances weights for teams that over-consumed shared resources recently.

---

### Step 3: Map Kumo Training Workloads to Run:ai Queues

When submitting Kumo model training jobs or batch orchestration workloads from your pipeline to the Kubernetes cluster, direct them to the designated Run:ai project queue using namespace annotations or the Run:ai CLI/API:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: kumo-production-training
  namespace: kumo-engine-tenant
  annotations:
    run.ai/project: "ml-platform-team" # Directs workload to the specific Run:ai project queue
spec:
  template:
    spec:
      containers:
      - name: kumo-trainer
        image: nvidia/kumo-engine:latest
        resources:
          limits:
            nvidia.com/gpu: "8" # Request 8 GPUs for distributed graph training
        command: ["python", "train_kumo_model.py"]
```

Because time-based fairshare is active on the node pool, if another team has continuously run heavy models and accumulated high historical over-quota usage, the Run:ai scheduler will automatically boost your Kumo training job's effective priority for the shared over-quota pool, ensuring your training pipeline gets scheduled without getting permanently blocked.

## Monitoring NVIDIA Run:ai Queue Utilization and Fairshare Weights in Prometheus and Grafana

To monitor NVIDIA Run:ai queue utilization and historical fairshare weights in Prometheus and Grafana, you tap into Run:ai's built-in Prometheus metrics exporter endpoint (which runs inside the control plane / cluster operator) and visualize the telemetry data using customized dashboards.

### Step 1: Configure Prometheus to Scrape Run:ai Metrics

Run:ai automatically exposes cluster, project, queue, and scheduler-level metrics via an internal Prometheus metrics endpoint on its control-plane services (typically under the `runai-system` namespace or via your cluster monitoring aggregator).

Add a scrape target block to your global `prometheus.yml` configuration (or apply it as a Kubernetes ServiceMonitor if using the Prometheus Operator):

```yaml
scrape_configs:
  - job_name: 'runai-scheduler-metrics'
    kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
            - runai-system
    relabel_configs:
      - source_labels: [__meta_k8s_service_name]
        regex: runai-scheduler-metrics-service # Match Run:ai metrics service name
        action: keep
      - target_label: __address__
        replacement: $1:9090 # Default metrics port for Run:ai scheduler/controller exporter
```

---

### Step 2: Key Run:ai Metrics for Queues & Fairshare

Once Prometheus is scraping targets, you can query specific time-series metrics. Run:ai exposes metrics corresponding to allocations, queue demands, and fairshare weights:

* **Queue Utilization / Allocated GPUs:** `runai_project_allocated_gpus` or `runai_queue_gpus_allocated`
* **Queue Demand / Pending Jobs:** `runai_queue_pending_gpus` or `runai_job_queue_duration_seconds`
* **Historical Fairshare Weights / Effective Priority:** `runai_scheduler_fairshare_weight` or `runai_project_effective_weight`

---

### Step 3: Build the Grafana Dashboard

Log into your Grafana instance, select your Prometheus data source, and build a dashboard containing the following panels using PromQL queries:

#### 1. Queue GPU Allocation vs. Quota (Time Series Panel)

Tracks how many GPUs each project queue is actively consuming relative to its guaranteed quota.

PromQL Query:

```text
sum(runai_project_allocated_gpus) by (project_name)
```

#### 2. Pending Demand / Queue Backlog (Stat / Bar Gauge Panel)

Monitors how many jobs or GPUs are waiting in the queue due to resource contention.

PromQL Query:

```text
sum(runai_queue_pending_gpus) by (project_name)
```

#### 3. Historical Fairshare Weights (Time Series Panel)

Visualizes how the time-based fairshare dynamic weights shift over the sliding window for each project queue.

PromQL Query:

```text
runai_scheduler_fairshare_weight
```
