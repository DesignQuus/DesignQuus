from __future__ import annotations

import argparse
import json
from pathlib import Path

from cad.dxf_adapter import DxfAdapter


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("path")
    parser.add_argument("--output")
    args = parser.parse_args()

    result = DxfAdapter().read(args.path).to_dict()
    text = json.dumps(result, ensure_ascii=False, indent=2)

    if args.output:
        Path(args.output).write_text(text, encoding="utf-8")
    else:
        print(text)


if __name__ == "__main__":
    main()
