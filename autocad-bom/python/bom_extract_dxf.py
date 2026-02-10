"""
bom_extract_dxf.py - DXF/DWG 파일에서 BOM(자재 명세서) 추출

AutoCAD 없이 DXF 파일에서 블록 속성을 읽어 BOM을 추출합니다.
ezdxf 라이브러리를 사용하여 DXF 파일을 파싱합니다.

사용법:
    # 단일 파일 추출
    python bom_extract_dxf.py drawing.dxf

    # 폴더 내 전체 DXF 일괄 추출
    python bom_extract_dxf.py ./drawings/ --recursive

    # 그룹화 키 및 출력 파일 지정
    python bom_extract_dxf.py drawing.dxf -g PART_NO -o bom_output.csv

    # Excel 형식으로 출력
    python bom_extract_dxf.py drawing.dxf --format xlsx

요구사항:
    pip install ezdxf
    pip install openpyxl  (Excel 출력 시)
"""

import argparse
import csv
import os
import sys
from collections import Counter, OrderedDict
from pathlib import Path

try:
    import ezdxf
except ImportError:
    print("ezdxf 라이브러리가 필요합니다: pip install ezdxf")
    sys.exit(1)


def extract_block_attributes(filepath, exclude_tags=None, include_tags=None):
    """DXF 파일에서 블록 속성을 추출합니다.

    Args:
        filepath: DXF 파일 경로
        exclude_tags: 제외할 속성 태그 목록
        include_tags: 포함할 속성 태그 목록 (None이면 전체 포함)

    Returns:
        (tags, records) 튜플
        - tags: 속성 태그 이름 리스트
        - records: 속성 값 딕셔너리 리스트
    """
    if exclude_tags is None:
        exclude_tags = []
    exclude_tags_upper = [t.upper() for t in exclude_tags]

    if include_tags is not None:
        include_tags_upper = [t.upper() for t in include_tags]
    else:
        include_tags_upper = None

    try:
        doc = ezdxf.readfile(filepath)
    except (IOError, ezdxf.DXFStructureError) as e:
        print(f"파일을 읽을 수 없습니다: {filepath} ({e})")
        return [], []

    msp = doc.modelspace()
    all_tags = OrderedDict()
    all_tags["BLOCK_NAME"] = True
    records = []

    for insert in msp.query("INSERT"):
        if not insert.attribs:
            continue

        record = {"BLOCK_NAME": insert.dxf.name}
        has_data = False

        for attrib in insert.attribs:
            tag = attrib.dxf.tag.upper()
            value = attrib.dxf.text.strip()

            # 태그 필터링
            if tag in exclude_tags_upper:
                continue
            if include_tags_upper is not None and tag not in include_tags_upper:
                continue

            all_tags[tag] = True
            record[tag] = value
            has_data = True

        if has_data:
            records.append(record)

    return list(all_tags.keys()), records


def extract_from_directory(dirpath, recursive=False, exclude_tags=None,
                           include_tags=None):
    """디렉터리에서 모든 DXF 파일의 BOM을 추출합니다.

    Args:
        dirpath: 디렉터리 경로
        recursive: 하위 폴더 포함 여부
        exclude_tags: 제외할 속성 태그 목록
        include_tags: 포함할 속성 태그 목록

    Returns:
        (tags, records) 튜플
    """
    path = Path(dirpath)
    pattern = "**/*.dxf" if recursive else "*.dxf"
    dxf_files = sorted(path.glob(pattern))

    if not dxf_files:
        print(f"DXF 파일을 찾을 수 없습니다: {dirpath}")
        return [], []

    print(f"{len(dxf_files)}개의 DXF 파일 발견")

    all_tags = OrderedDict()
    all_tags["BLOCK_NAME"] = True
    all_tags["SOURCE_FILE"] = True
    all_records = []

    for i, dxf_file in enumerate(dxf_files, 1):
        print(f"  처리 중 ({i}/{len(dxf_files)}): {dxf_file.name}")
        tags, records = extract_block_attributes(
            str(dxf_file), exclude_tags, include_tags
        )

        for tag in tags:
            all_tags[tag] = True

        for rec in records:
            rec["SOURCE_FILE"] = dxf_file.stem
            all_records.append(rec)

    return list(all_tags.keys()), all_records


def group_records(tags, records, group_by="PART_NO", count_field="QTY"):
    """동일 항목을 그룹화하고 수량을 계산합니다.

    Args:
        tags: 태그 이름 리스트
        records: 레코드 딕셔너리 리스트
        group_by: 그룹화 기준 태그
        count_field: 수량 필드명

    Returns:
        (tags, grouped_records) 튜플
    """
    group_by_upper = group_by.upper()

    if group_by_upper not in [t.upper() for t in tags]:
        # 그룹화 키가 없으면 수량 1로 반환
        new_tags = tags + [count_field]
        for rec in records:
            rec[count_field] = "1"
        return new_tags, records

    # 그룹화
    groups = OrderedDict()
    for rec in records:
        key = rec.get(group_by_upper, rec.get(group_by, "")).upper()
        if key not in groups:
            groups[key] = {"record": rec.copy(), "count": 1}
        else:
            groups[key]["count"] += 1

    # 결과 생성
    new_tags = tags + [count_field]
    grouped = []
    for key, group in groups.items():
        rec = group["record"]
        rec[count_field] = str(group["count"])
        grouped.append(rec)

    return new_tags, grouped


def sort_records(records, sort_by="PART_NO"):
    """레코드를 지정 태그 기준으로 정렬합니다."""
    sort_by_upper = sort_by.upper()
    return sorted(records, key=lambda r: r.get(sort_by_upper, r.get(sort_by, "")))


def write_csv(filepath, tags, records, delimiter=","):
    """BOM 데이터를 CSV 파일로 저장합니다."""
    with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f, delimiter=delimiter)
        writer.writerow(tags)
        for rec in records:
            row = [rec.get(tag, "") for tag in tags]
            writer.writerow(row)
    print(f"CSV 저장 완료: {filepath} ({len(records)} 행)")


def write_xlsx(filepath, tags, records):
    """BOM 데이터를 Excel 파일로 저장합니다."""
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    except ImportError:
        print("Excel 출력에는 openpyxl이 필요합니다: pip install openpyxl")
        sys.exit(1)

    wb = Workbook()
    ws = wb.active
    ws.title = "BOM"

    # 스타일 정의
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4",
                              fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center")
    thin_border = Border(
        left=Side(style="thin"),
        right=Side(style="thin"),
        top=Side(style="thin"),
        bottom=Side(style="thin"),
    )

    # 헤더 행
    for col_idx, tag in enumerate(tags, 1):
        cell = ws.cell(row=1, column=col_idx, value=tag)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border

    # 데이터 행
    for row_idx, rec in enumerate(records, 2):
        for col_idx, tag in enumerate(tags, 1):
            cell = ws.cell(row=row_idx, column=col_idx,
                           value=rec.get(tag, ""))
            cell.border = thin_border
            cell.alignment = Alignment(vertical="center")

    # 열 너비 자동 조정
    for col_idx, tag in enumerate(tags, 1):
        max_len = len(tag)
        for rec in records:
            val = str(rec.get(tag, ""))
            max_len = max(max_len, len(val))
        ws.column_dimensions[chr(64 + col_idx) if col_idx <= 26
                             else "A"].width = min(max_len + 4, 50)

    # 필터 설정
    ws.auto_filter.ref = ws.dimensions

    # 첫 행 고정
    ws.freeze_panes = "A2"

    wb.save(filepath)
    print(f"Excel 저장 완료: {filepath} ({len(records)} 행)")


def main():
    parser = argparse.ArgumentParser(
        description="DXF 파일에서 BOM(자재 명세서)을 추출합니다.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  %(prog)s drawing.dxf                          단일 파일 BOM 추출
  %(prog)s ./drawings/ --recursive               폴더 일괄 추출
  %(prog)s drawing.dxf -g PART_NO -o output.csv  그룹화 키 및 출력 파일 지정
  %(prog)s drawing.dxf --format xlsx             Excel 형식으로 출력
  %(prog)s drawing.dxf --exclude SCALE DATE      특정 태그 제외
        """,
    )

    parser.add_argument("input", help="DXF 파일 또는 디렉터리 경로")
    parser.add_argument("-o", "--output", help="출력 파일 경로")
    parser.add_argument(
        "-g", "--group-by", default="PART_NO",
        help="수량 그룹화 기준 태그 (기본값: PART_NO)"
    )
    parser.add_argument(
        "-s", "--sort-by", default="PART_NO",
        help="정렬 기준 태그 (기본값: PART_NO)"
    )
    parser.add_argument(
        "--no-group", action="store_true",
        help="그룹화 비활성화 (모든 항목 개별 출력)"
    )
    parser.add_argument(
        "-r", "--recursive", action="store_true",
        help="하위 디렉터리 포함 검색"
    )
    parser.add_argument(
        "--format", choices=["csv", "xlsx"], default="csv",
        help="출력 형식 (기본값: csv)"
    )
    parser.add_argument(
        "--delimiter", default=",",
        help="CSV 구분자 (기본값: 쉼표)"
    )
    parser.add_argument(
        "--exclude", nargs="+", default=["SCALE", "DATE", "DWG_NO"],
        help="제외할 속성 태그 목록"
    )
    parser.add_argument(
        "--include", nargs="+", default=None,
        help="포함할 속성 태그 목록 (지정 시 이 태그만 추출)"
    )
    parser.add_argument(
        "--count-field", default="QTY",
        help="수량 필드명 (기본값: QTY)"
    )

    args = parser.parse_args()
    input_path = Path(args.input)

    if not input_path.exists():
        print(f"경로를 찾을 수 없습니다: {args.input}")
        sys.exit(1)

    # 데이터 추출
    if input_path.is_dir():
        tags, records = extract_from_directory(
            str(input_path), args.recursive, args.exclude, args.include
        )
    elif input_path.is_file():
        tags, records = extract_block_attributes(
            str(input_path), args.exclude, args.include
        )
    else:
        print(f"유효하지 않은 경로: {args.input}")
        sys.exit(1)

    if not records:
        print("추출된 BOM 데이터가 없습니다.")
        sys.exit(0)

    print(f"추출 완료: {len(records)}개 블록 속성")

    # 그룹화
    if not args.no_group:
        tags, records = group_records(
            tags, records, args.group_by, args.count_field
        )
        print(f"그룹화 완료: {len(records)}개 항목")

    # 정렬
    records = sort_records(records, args.sort_by)

    # 출력 파일 경로 결정
    if args.output:
        output_path = args.output
    else:
        if input_path.is_dir():
            base = input_path / "BOM_output"
        else:
            base = input_path.parent / f"BOM_{input_path.stem}"
        ext = ".xlsx" if args.format == "xlsx" else ".csv"
        output_path = str(base) + ext

    # 파일 저장
    if args.format == "xlsx":
        write_xlsx(output_path, tags, records)
    else:
        write_csv(output_path, tags, records, args.delimiter)


if __name__ == "__main__":
    main()
