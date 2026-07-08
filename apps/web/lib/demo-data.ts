export const ruleTests = [
  { name: '회의실 적용', status: 'PASSED', detail: 'CONFERENCE_ROOM → MAX_OF' },
  { name: '사무실 미적용', status: 'PASSED', detail: 'OFFICE → NOT_APPLICABLE' },
  { name: '인원 누락 검토', status: 'PASSED', detail: 'Missing occupancy → REVIEW_REQUIRED' },
  { name: '시행일 이전', status: 'PASSED', detail: 'Reference date outside effective range' },
];

export const catalogRows = [
  { model: 'ERV-A', airflow: '600 m³/h', esp: '147.10 Pa', power: '0.350 kW', status: 'VALID' },
  { model: 'ERV-B', airflow: '1,200 m³/h', esp: '196.13 Pa', power: '0.700 kW', status: 'VALID' },
  { model: 'ERV-C', airflow: '1,800 m³/h', esp: '245.17 Pa', power: '0.950 kW', status: 'VALID' },
];

export const pipelineSteps = [
  '도면 업로드',
  'AI·CAD 공간 분석',
  'Engineering SPACE',
  '법령 적용성',
  '환기량 계산',
  'ERV 장비선정',
  'Design BOM',
  '전문가 승인',
];
