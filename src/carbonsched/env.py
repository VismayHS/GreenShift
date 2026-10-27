"""Runtime environment for local Spark on Windows.

Spark 4.2 supports Java 17/21/25 only, so we point JAVA_HOME at the portable
JDK 21 in .tools/ instead of the system Java 26. SPARK_HOME is set explicitly
because pyspark's find-spark-home.cmd breaks on paths containing spaces.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from . import PROJECT_ROOT


def _find_jdk() -> Path | None:
    tools = PROJECT_ROOT / ".tools"
    if tools.is_dir():
        for d in sorted(tools.glob("jdk-21*"), reverse=True):
            if (d / "bin" / "java.exe").exists() or (d / "bin" / "java").exists():
                return d
    return None


def configure() -> None:
    """Set JAVA_HOME, SPARK_HOME and PYSPARK_PYTHON for this process."""
    jdk = _find_jdk()
    if jdk is not None:
        os.environ["JAVA_HOME"] = str(jdk)
        os.environ["PATH"] = str(jdk / "bin") + os.pathsep + os.environ.get("PATH", "")

    import pyspark

    # Keeps a cluster's SPARK_HOME (e.g. /opt/spark on a Hadoop box) if one is set.
    os.environ.setdefault("SPARK_HOME", str(Path(pyspark.__file__).parent))
    os.environ["PYSPARK_PYTHON"] = sys.executable
    os.environ["PYSPARK_DRIVER_PYTHON"] = sys.executable


def spark_session(app_name: str, cores: int | str = "*", driver_memory: str = "6g",
                  shuffle_partitions: int = 24, master: str | None = None):
    """SparkSession; local[cores] by default, or e.g. master="yarn".

    CARBONSCHED_SPARK_MASTER overrides the default without code changes.
    """
    configure()
    from pyspark.sql import SparkSession

    master = master or os.environ.get("CARBONSCHED_SPARK_MASTER") or f"local[{cores}]"
    return (
        SparkSession.builder.master(master)
        .appName(app_name)
        .config("spark.driver.memory", driver_memory)
        .config("spark.sql.shuffle.partitions", shuffle_partitions)
        .config("spark.sql.adaptive.enabled", "true")
        .config("spark.ui.showConsoleProgress", "false")
        .config("spark.sql.session.timeZone", "UTC")
        .getOrCreate()
    )
