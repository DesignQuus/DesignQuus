from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable
import json
import re

from .contracts import CadObject


@dataclass(frozen=True)
class LayerClassification:
    layer_name: str
    category: str
    confidence_score: float
    score_breakdown: dict[str, float]
    matched_rules: list[str]
    object_count: int
    entity_histogram: dict[str, int]

    def to_dict(self) -> dict:
        return asdict(self)


class LayerClassifier:
    version = 'LAYER_CLASSIFIER/0.6.0'

    def __init__(self, policy: dict):
        self.policy = policy

    @classmethod
    def from_json(cls, path: str | Path) -> 'LayerClassifier':
        return cls(json.loads(Path(path).read_text(encoding='utf-8')))

    def classify(self, objects: Iterable[CadObject]) -> list[LayerClassification]:
        grouped: dict[str, list[CadObject]] = defaultdict(list)
        for obj in objects:
            grouped[obj.layer_name].append(obj)

        results = []
        for layer_name, items in grouped.items():
            results.append(self.classify_layer(layer_name, items))
        return sorted(results, key=lambda x: x.layer_name.casefold())

    def classify_layer(self, layer_name: str, objects: list[CadObject]) -> LayerClassification:
        normalized = self._normalize(layer_name)
        histogram = Counter(o.entity_type for o in objects)
        scores: dict[str, float] = {}
        evidence: dict[str, list[str]] = defaultdict(list)

        total_objects = max(1, len(objects))

        for category_policy in self.policy['categories']:
            category = category_policy['category']
            score = float(category_policy.get('base_weight', 0.0))

            for pattern in category_policy.get('name_patterns', []):
                if self._pattern_matches(normalized, self._normalize(pattern)):
                    score += 0.55
                    evidence[category].append(f'NAME:{pattern}')

            for entity_type, weight in category_policy.get('entity_type_weights', {}).items():
                ratio = histogram.get(entity_type, 0) / total_objects
                if ratio > 0:
                    contribution = float(weight) * ratio
                    score += contribution
                    evidence[category].append(f'ENTITY:{entity_type}:{ratio:.3f}')

            scores[category] = min(1.0, score)

        best_category = max(scores, key=scores.get) if scores else 'UNKNOWN'
        best_score = scores.get(best_category, 0.0)
        sorted_scores = sorted(scores.values(), reverse=True)
        second = sorted_scores[1] if len(sorted_scores) > 1 else 0.0
        gap = max(0.0, best_score - second)

        if best_score < 0.40:
            best_category = 'UNKNOWN'
            confidence = min(0.60, best_score)
        else:
            confidence = min(1.0, 0.65 * best_score + 0.35 * gap)

        return LayerClassification(
            layer_name=layer_name,
            category=best_category,
            confidence_score=round(confidence, 5),
            score_breakdown={k: round(v, 5) for k, v in scores.items()},
            matched_rules=evidence.get(best_category, []),
            object_count=len(objects),
            entity_histogram=dict(histogram),
        )

    @staticmethod
    def _normalize(value: str) -> str:
        return re.sub(r'[^0-9a-zA-Z가-힣]+', '_', value.casefold()).strip('_')

    @staticmethod
    def _pattern_matches(layer: str, pattern: str) -> bool:
        if not pattern:
            return False
        tokens = set(filter(None, layer.split('_')))
        return pattern in layer or pattern in tokens
