from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Protocol, Any
from urllib.request import Request, urlopen
import json


@dataclass(frozen=True)
class RecognitionRequest:
    request_id: str
    file_url: str
    file_type: str
    pages: list[int]
    requested_objects: list[str]


@dataclass(frozen=True)
class RecognitionResult:
    adapter: str
    model: str | None
    objects: list[dict[str, Any]]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class DrawingRecognitionAdapter(Protocol):
    def recognize(self, request: RecognitionRequest) -> RecognitionResult: ...


def _check01(value: float, field: str) -> None:
    if not 0.0 <= value <= 1.0:
        raise ValueError(f'{field} must be between 0 and 1')


def validate_geometry(geometry: dict[str, Any]) -> None:
    kind = geometry.get('type')
    if kind == 'RECT':
        for key in ('x', 'y', 'width', 'height'):
            _check01(float(geometry[key]), key)
        if geometry['x'] + geometry['width'] > 1.000001:
            raise ValueError('RECT exceeds page width')
        if geometry['y'] + geometry['height'] > 1.000001:
            raise ValueError('RECT exceeds page height')
    elif kind in ('POLYGON', 'POLYLINE'):
        points = geometry.get('points')
        if not isinstance(points, list) or len(points) < 2:
            raise ValueError(f'{kind} requires points')
        for index, point in enumerate(points):
            if not isinstance(point, list) or len(point) != 2:
                raise ValueError(f'invalid point at {index}')
            _check01(float(point[0]), f'points[{index}].x')
            _check01(float(point[1]), f'points[{index}].y')
    elif kind == 'POINT':
        _check01(float(geometry['x']), 'x')
        _check01(float(geometry['y']), 'y')
    else:
        raise ValueError(f'unsupported geometry type: {kind}')


def validate_result(result: RecognitionResult) -> None:
    for index, obj in enumerate(result.objects):
        score = float(obj['confidence_score'])
        _check01(score, f'objects[{index}].confidence_score')
        if obj.get('coordinate_space') != 'PAGE_NORMALIZED':
            raise ValueError('v0.4 adapter output must use PAGE_NORMALIZED')
        geometry = obj.get('normalized_geometry')
        if geometry is not None:
            validate_geometry(geometry)


class MockDrawingRecognitionAdapter:
    def recognize(self, request: RecognitionRequest) -> RecognitionResult:
        result = RecognitionResult(
            adapter='MOCK_V04',
            model='fixture-v1',
            objects=[
                {
                    'object_type': 'ROOM',
                    'raw_value': '회의실 A',
                    'normalized_value': '회의실 A',
                    'confidence_score': 0.97,
                    'source_page': request.pages[0] if request.pages else 1,
                    'coordinate_space': 'PAGE_NORMALIZED',
                    'geometry_kind': 'POLYGON',
                    'normalized_geometry': {
                        'type': 'POLYGON',
                        'points': [[0.08,0.12],[0.46,0.12],[0.46,0.46],[0.08,0.46]],
                    },
                    'attributes': {
                        'space_type_code': 'CONFERENCE_ROOM',
                        'area_m2': 52.4,
                    },
                },
                {
                    'object_type': 'ROOM',
                    'raw_value': '사무실',
                    'normalized_value': '사무실',
                    'confidence_score': 0.91,
                    'source_page': request.pages[0] if request.pages else 1,
                    'coordinate_space': 'PAGE_NORMALIZED',
                    'geometry_kind': 'RECT',
                    'normalized_geometry': {
                        'type': 'RECT', 'x': 0.56, 'y': 0.15, 'width': 0.33, 'height': 0.30,
                    },
                    'attributes': {'space_type_code': 'OFFICE', 'area_m2': 41.8},
                },
            ],
        )
        validate_result(result)
        return result


class HttpDrawingRecognitionAdapter:
    def __init__(self, endpoint: str, api_key: str | None = None, timeout_seconds: int = 120):
        self.endpoint = endpoint
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds

    def recognize(self, request: RecognitionRequest) -> RecognitionResult:
        payload = json.dumps(asdict(request)).encode('utf-8')
        headers = {'content-type': 'application/json'}
        if self.api_key:
            headers['authorization'] = f'Bearer {self.api_key}'
        req = Request(self.endpoint, data=payload, headers=headers, method='POST')
        with urlopen(req, timeout=self.timeout_seconds) as response:
            raw = json.loads(response.read().decode('utf-8'))
        result = RecognitionResult(
            adapter=str(raw['adapter']),
            model=raw.get('model'),
            objects=list(raw.get('objects', [])),
        )
        validate_result(result)
        return result
