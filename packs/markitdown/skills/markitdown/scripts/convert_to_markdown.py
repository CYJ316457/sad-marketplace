from __future__ import annotations

import argparse
import subprocess
import sys
import unicodedata
from pathlib import Path
from typing import Iterable

OPTIONAL_EXTRA_BY_SUFFIX = {
    ".pdf": "pdf",
    ".docx": "docx",
    ".pptx": "pptx",
    ".xls": "xls",
    ".xlsx": "xlsx",
}
PDF_SUFFIXES = {".pdf"}
PDF_GLYPH_REPLACEMENTS = {
    "\u2ecb": "车",
    "\u2eda": "页",
    "\u2ec5": "见",
}


def markitdown_install_spec(input_path: Path) -> str:
    extra = OPTIONAL_EXTRA_BY_SUFFIX.get(input_path.suffix.lower())
    return f"markitdown[{extra}]" if extra else "markitdown"


def run_pip_install(spec: str) -> None:
    subprocess.check_call([sys.executable, "-m", "pip", "install", spec])


def import_markitdown():
    from markitdown import MarkItDown  # type: ignore

    return MarkItDown


def ensure_markitdown(input_path: Path):
    try:
        return import_markitdown()
    except Exception:
        spec = markitdown_install_spec(input_path)
        print(f"markitdown is not installed; installing {spec} with pip...", file=sys.stderr)
        run_pip_install(spec)
        return import_markitdown()


def ensure_optional_extra(input_path: Path) -> None:
    spec = markitdown_install_spec(input_path)
    if spec == "markitdown":
        return
    print(f"Support for {input_path.suffix.lower()} is missing; installing {spec} with pip...", file=sys.stderr)
    run_pip_install(spec)


def ensure_pdf_extra() -> None:
    try:
        import pdfplumber  # noqa: F401
    except Exception:
        ensure_optional_extra(Path("document.pdf"))


def clean_markdown(text: str) -> str:
    cleaned = unicodedata.normalize("NFKC", text)
    for source, replacement in PDF_GLYPH_REPLACEMENTS.items():
        cleaned = cleaned.replace(source, replacement)
    cleaned = "".join(
        char for char in cleaned
        if char in "\n\r\t" or unicodedata.category(char)[0] != "C"
    )
    return cleaned


def convert_once(input_path: Path):
    MarkItDown = ensure_markitdown(input_path)
    if input_path.suffix.lower() in PDF_SUFFIXES:
        ensure_pdf_extra()
    md = MarkItDown()
    return md.convert(str(input_path))


def conversion_error_mentions_pdf_extra(error: BaseException) -> bool:
    message = str(error).lower()
    return "markitdown[pdf]" in message or "optional dependency [pdf]" in message or "pdfconverter" in message


def conversion_error_mentions_optional_extra(input_path: Path, error: BaseException) -> bool:
    extra = OPTIONAL_EXTRA_BY_SUFFIX.get(input_path.suffix.lower())
    if extra is None:
        return False

    message = str(error).lower()
    markers = [
        f"markitdown[{extra}]",
        f"optional dependency [{extra}]",
        f"{extra}converter",
    ]
    if extra == "docx":
        markers.extend(["mammoth", "lxml"])
    elif extra == "pptx":
        markers.append("python-pptx")
    elif extra == "xlsx":
        markers.extend(["openpyxl", "pandas"])
    elif extra == "xls":
        markers.extend(["xlrd", "pandas"])

    return any(marker in message for marker in markers)


def convert(input_path: Path, output_path: Path, *, no_clean: bool = False) -> None:
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")
    if input_path.is_dir():
        raise IsADirectoryError(f"Input path is a directory: {input_path}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        result = convert_once(input_path)
    except Exception as error:
        if input_path.suffix.lower() in PDF_SUFFIXES and conversion_error_mentions_pdf_extra(error):
            ensure_pdf_extra()
            result = convert_once(input_path)
        elif conversion_error_mentions_optional_extra(input_path, error):
            ensure_optional_extra(input_path)
            result = convert_once(input_path)
        else:
            raise

    text = getattr(result, "text_content", None)
    if text is None:
        raise RuntimeError("markitdown returned no text_content")
    if not no_clean:
        text = clean_markdown(text)
    output_path.write_text(text, encoding="utf-8", newline="\n")
    print(f"Converted: {input_path} -> {output_path}")
    print(f"Markdown bytes: {output_path.stat().st_size}")
    print(f"Markdown lines: {len(text.splitlines())}")
    if len(text.strip()) < 80:
        print(
            "Warning: Markdown output is very short; the source may be scanned/image-only or conversion may be incomplete.",
            file=sys.stderr,
        )


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Convert a document to Markdown using microsoft/markitdown.")
    parser.add_argument("input", help="Input document path, e.g. PDF/DOCX/PPTX/XLSX/HTML")
    parser.add_argument("output", nargs="?", help="Output Markdown path. Defaults to input path with .md suffix")
    parser.add_argument("--no-clean", action="store_true", help="Disable Unicode normalization and PDF glyph cleanup")
    args = parser.parse_args(list(argv) if argv is not None else None)

    input_path = Path(args.input).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve() if args.output else input_path.with_suffix(".md")
    convert(input_path, output_path, no_clean=args.no_clean)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
