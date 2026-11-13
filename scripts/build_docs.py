"""Render the submission documents from Markdown to PDF (headless Chrome or Chromium).

Writes:
  report/technical_report.pdf   from report/technical_report.md  (the 3-5 page technical report)
  docs/model_card.pdf           from MODEL_CARD.md
  docs/data_cards.pdf           from datacards/*.md (all four data cards)
  notebooks/results.html        static copy of the executed results notebook

Usage:
    python scripts/build_docs.py            # needs requirements-dev.txt and Chrome/Chromium on PATH
"""

from __future__ import annotations

import html
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parents[1]
REPO_URL = "https://github.com/VismayHS/GreenShift"

CSS = """
@page { size: A4; margin: 15mm 16mm 15mm 16mm; }
* { box-sizing: border-box; }
body { font-family: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 9.6pt;
       line-height: 1.42; color: #1a202c; margin: 0; }
h1 { font-size: 17pt; margin: 0 0 4pt; line-height: 1.2; color: #12372a; }
h2 { font-size: 11.6pt; margin: 11pt 0 4pt; padding-bottom: 2pt; border-bottom: 1px solid #c6d6cc;
     color: #12372a; break-after: avoid; }
h3 { font-size: 10.2pt; margin: 8pt 0 3pt; break-after: avoid; }
p { margin: 0 0 5pt; }
ul, ol { margin: 0 0 5pt; padding-left: 15pt; }
li { margin: 0 0 2pt; }
a { color: #1f6f50; text-decoration: none; }
code { font-family: "JetBrains Mono", Consolas, Menlo, monospace; font-size: 8.4pt; background: #f1f5f3;
       padding: 0 2pt; border-radius: 2pt; }
pre { background: #f1f5f3; padding: 5pt 7pt; border-radius: 3pt; font-size: 8.2pt; overflow: hidden; }
pre code { background: none; padding: 0; }
blockquote { margin: 4pt 0 7pt; padding: 5pt 9pt; background: #fff8e6; border-left: 3px solid #d69e2e; }
blockquote p { margin: 0; }
table { border-collapse: collapse; width: 100%; margin: 3pt 0 7pt; font-size: 8.6pt; break-inside: avoid; }
th, td { border: 1px solid #d5dfd9; padding: 2.5pt 5pt; text-align: left; vertical-align: top; }
th { background: #e8f1ec; font-weight: 600; }
img { max-width: 100%; display: block; margin: 4pt auto 6pt; break-inside: avoid; }
img[alt="Savings vs delay"] { max-width: 74%; }
.cardsep { break-before: page; }
"""


def chrome() -> str:
    for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome", "msedge"):
        path = shutil.which(name)
        if path:
            return path
    sys.exit("Chrome or Chromium is needed to print PDFs; install one or open the .md files directly.")


def to_html(md_text: str, base: Path, title: str) -> str:
    body = markdown.markdown(md_text, extensions=["tables", "fenced_code", "sane_lists"])
    # Repo-relative links point at GitHub so they still work inside the PDF.
    body = re.sub(r'href="(?!https?://|#|mailto:)([^"]+)"',
                  lambda m: f'href="{REPO_URL}/blob/main/{(base.relative_to(ROOT) / m.group(1)).as_posix()}"'
                  if (base / m.group(1)).resolve().is_relative_to(ROOT) else m.group(0), body)
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{html.escape(title)}</title>'
            f'<base href="{base.as_uri()}/"><style>{CSS}</style></head><body>{body}</body></html>')


def print_pdf(page: str, out: Path) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "page.html"
        src.write_text(page, encoding="utf-8")
        subprocess.run([chrome(), "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                        f"--user-data-dir={tmp}/profile", f"--print-to-pdf={out}", src.as_uri()],
                       check=True, capture_output=True)
    print(f"{out.relative_to(ROOT)}: {out.stat().st_size / 1e3:.0f} kB")


def main() -> None:
    report = ROOT / "report" / "technical_report.md"
    print_pdf(to_html(report.read_text(encoding="utf-8"), report.parent, "GreenShift technical report"),
              ROOT / "report" / "technical_report.pdf")

    card = ROOT / "MODEL_CARD.md"
    print_pdf(to_html(card.read_text(encoding="utf-8"), ROOT, "GreenShift model card"), ROOT / "docs" / "model_card.pdf")

    order = ["uk_carbon_intensity_api", "neso_historic_generation_mix", "tpcds", "electricity_maps"]
    cards = [ROOT / "datacards" / f"{name}.md" for name in order]
    joined = ("# GreenShift data cards\n\nOne card per dataset: licence, access, provenance and known issues. "
              "The first three are used; Electricity Maps was substituted by NESO data (see its card).\n\n"
              + "\n\n<div class=\"cardsep\"></div>\n\n".join(c.read_text(encoding="utf-8") for c in cards))
    print_pdf(to_html(joined, ROOT / "datacards", "GreenShift data cards"), ROOT / "docs" / "data_cards.pdf")

    nb = ROOT / "notebooks" / "results.ipynb"
    subprocess.run([sys.executable, "-m", "nbconvert", "--to", "html", "--log-level=ERROR", str(nb)], check=True)
    print(f"{nb.with_suffix('.html').relative_to(ROOT)}: {nb.with_suffix('.html').stat().st_size / 1e3:.0f} kB")


if __name__ == "__main__":
    main()
