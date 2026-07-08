from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
import os
import shlex
import shutil
import subprocess


class DwgConverterAdapter(ABC):
    @abstractmethod
    def convert(self, source_dwg: Path, output_dir: Path) -> Path:
        raise NotImplementedError


class MockDwgConverterAdapter(DwgConverterAdapter):
    def convert(self, source_dwg: Path, output_dir: Path) -> Path:
        if source_dwg.suffix.lower() != ".dxf":
            raise ValueError("Mock converter only accepts DXF fixtures")
        output_dir.mkdir(parents=True, exist_ok=True)
        target = output_dir / source_dwg.name
        shutil.copy2(source_dwg, target)
        return target


class CommandTemplateDwgConverterAdapter(DwgConverterAdapter):
    def __init__(self, template: str | None = None):
        self.template = template or os.environ.get(
            "DWG_CONVERTER_COMMAND_TEMPLATE"
        )
        if not self.template:
            raise ValueError("DWG converter command template is not configured")

    def convert(self, source_dwg: Path, output_dir: Path) -> Path:
        if source_dwg.suffix.lower() != ".dwg":
            raise ValueError("Source must be a .dwg file")

        output_dir.mkdir(parents=True, exist_ok=True)
        input_dir = source_dwg.parent

        command = self.template.format(
            source=str(source_dwg),
            input_dir=str(input_dir),
            output_dir=str(output_dir),
            stem=source_dwg.stem,
        )
        args = shlex.split(command)
        subprocess.run(args, check=True)

        expected = output_dir / f"{source_dwg.stem}.dxf"
        if not expected.exists():
            matches = list(output_dir.glob(f"{source_dwg.stem}*.dxf"))
            if len(matches) != 1:
                raise RuntimeError(
                    f"Converted DXF not found for {source_dwg.name}"
                )
            return matches[0]
        return expected
