from __future__ import annotations

from pathlib import Path
from typing import Any

from .contracts import CadImportResult
from .entity_normalizer import (
    normalize_block_reference,
    normalize_line,
    normalize_polyline,
    normalize_text,
)


class DxfAdapter:
    name = "ezdxf"

    def read(self, path: str | Path) -> CadImportResult:
        ezdxf, recover = self._load_ezdxf()

        path = Path(path)
        try:
            doc = ezdxf.readfile(path)
        except Exception:
            doc, auditor = recover.readfile(path)
            if auditor.has_errors:
                raise RuntimeError(
                    f"DXF recovery completed with {len(auditor.errors)} errors"
                )

        msp = doc.modelspace()
        objects = []

        for entity in msp:
            obj = self._normalize_entity(entity)
            if obj is not None:
                objects.append(obj)

        units = None
        unit_code = None
        try:
            unit_code = int(doc.header.get('$INSUNITS', 0))
            units = str(doc.units)
        except Exception:
            pass

        return CadImportResult(
            source_units=units,
            source_unit_code=unit_code,
            objects=objects,
            parser_adapter=self.name,
            parser_version=getattr(ezdxf, "__version__", "unknown"),
        )

    @staticmethod
    def _load_ezdxf():
        try:
            import ezdxf
            from ezdxf import recover
        except ImportError as exc:
            raise RuntimeError(
                "ezdxf is required. Install workers/cad-worker/requirements.txt"
            ) from exc
        return ezdxf, recover

    def _normalize_entity(self, entity: Any):
        kind = entity.dxftype()
        handle = getattr(entity.dxf, "handle", None)
        layer = getattr(entity.dxf, "layer", "0")

        if kind == "LINE":
            return normalize_line(
                handle=handle,
                layer=layer,
                start=tuple(entity.dxf.start),
                end=tuple(entity.dxf.end),
            )

        if kind == "TEXT":
            return normalize_text(
                handle=handle,
                layer=layer,
                text_value=entity.dxf.text,
                insert=tuple(entity.dxf.insert),
                height=getattr(entity.dxf, "height", None),
                rotation_deg=getattr(entity.dxf, "rotation", None),
                multiline=False,
            )

        if kind == "MTEXT":
            return normalize_text(
                handle=handle,
                layer=layer,
                text_value=entity.text,
                insert=tuple(entity.dxf.insert),
                height=getattr(entity.dxf, "char_height", None),
                rotation_deg=None,
                multiline=True,
            )

        if kind == "LWPOLYLINE":
            points = [
                (float(v.x), float(v.y), float(v.z))
                for v in entity.vertices_in_wcs()
            ]
            return normalize_polyline(
                handle=handle,
                layer=layer,
                points=points,
                closed=bool(entity.closed),
                lightweight=True,
            )

        if kind == "POLYLINE":
            points = [
                (float(v.x), float(v.y), float(v.z))
                for v in entity.points_in_wcs()
            ]
            return normalize_polyline(
                handle=handle,
                layer=layer,
                points=points,
                closed=bool(entity.is_closed),
                lightweight=False,
            )

        if kind == "INSERT":
            attribs = {
                attrib.dxf.tag: attrib.dxf.text
                for attrib in entity.attribs
            }
            return normalize_block_reference(
                handle=handle,
                layer=layer,
                block_name=entity.dxf.name,
                insert=tuple(entity.dxf.insert),
                rotation_deg=float(getattr(entity.dxf, "rotation", 0.0)),
                x_scale=float(getattr(entity.dxf, "xscale", 1.0)),
                y_scale=float(getattr(entity.dxf, "yscale", 1.0)),
                z_scale=float(getattr(entity.dxf, "zscale", 1.0)),
                attribs=attribs,
            )

        return None
