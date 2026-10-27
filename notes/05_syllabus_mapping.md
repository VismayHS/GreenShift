# 05: Syllabus mapping (UE24AM343AB3, Track G: Governance, Compliance & Sustainability)

How each part of the project connects to course units. Use this in the report intro/viva.

| Syllabus topic | Where it shows up in the project |
|---|---|
| Spark architecture: DAG, driver/executor | Jobs are Spark SQL DAGs. Energy is attributed per stage using executor CPU time from the Spark REST API |
| RDDs/DataFrames/Spark SQL | All 99 TPC-DS queries run as Spark SQL over Parquet DataFrames |
| Column-oriented storage, HDFS/S3 | Parquet + zstd columnar data. Scan bytes (inputBytes) are a driver of energy |
| YARN: resource management & scheduling | Our scheduler is a *time-dimension* admission layer on top of YARN/K8s queues: it decides **when** a job is submitted, and YARN decides **where**. Capacity k = number of concurrent queue slots |
| Cluster managers YARN/K8s, cloud deployment (EMR, Dataproc, Databricks) | Extrapolation section: per-node power model + PUE. Discussion of carbon-aware region choice (spatial shifting) |
| Distributed ML (MLlib) | Optional `ml_segmentation` job, and the linear power model calibration (regression) |
| Orchestration (Airflow, Prefect) | Deliverable: an Airflow DAG / sensor that defers a task until the carbon-optimal slot (`TimeSensor` / deferrable operator), with fallback before the deadline |
| Data governance; metadata management | Data cards for every dataset, a provenance manifest (download date, SHA-256, licence), and a run log of every measurement |
| Data quality | Gap handling in the CI series (missing forecasts, missing half-hours) and validating the API against NESO historic data |
| Regulatory & compliance | Licences (CC BY 4.0, ODbL share-alike, TPC EULA/fair use). Emissions reporting aligned with the GHG Protocol Scope 2 location-based method. ESG/CSRD-style disclosure of data-centre energy |
| Responsible AI / trustworthy systems: transparency, accountability | Transparent methodology, uncertainty bars, stated limitations (average vs marginal CI, RAPL scope). The scheduler logs *why* it delayed each job (auditability) |
| Ethical issues | Fairness of delay (does one team's job always get pushed?). Rebound effects. Greenwashing risk if savings are overstated |
