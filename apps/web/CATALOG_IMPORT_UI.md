# Catalog Import UI v0.9

## Upload

```text
Manufacturer
DEMO-MFG

Source Format
CSV

Mapping
DEMO_ERV_CSV v1
```

## Mapping Preview

```text
Source Column    → Canonical Field
Model            → model_code
Airflow          → airflow_m3_h
ESP              → external_static_pressure_pa
Power            → power_input_kw
```

## Validation

```text
Rows       100
Valid       94
Warning      4
Error        2
Duplicate    3
```

## Unit Conversion

```text
Airflow
10 m3/min
→
600 m3/h
```

```text
ESP
15 mmAq
→
147.10 Pa
```

```text
Power
350 W
→
0.350 kW
```

## Publish

```text
Error = 0
Duplicate Conflict = 0
Mapping = APPROVED
```

일 때만 Publish.
