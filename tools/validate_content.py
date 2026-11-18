#!/usr/bin/env python3
"""Validate example catalogue entries against project JSON Schemas."""
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
try:
    from jsonschema import Draft202012Validator
except ImportError:
    print("Install dependency: python3 -m pip install jsonschema")
    sys.exit(2)

pairs = [
    ("content/schemas/game.schema.json", "examples/game-example/game.json"),
    ("content/schemas/activity.schema.json", "examples/try-activity-example/activity.json"),
    ("content/schemas/provider.schema.json", "examples/provider-example/provider.json"),
    ("content/schemas/theme.schema.json", "examples/theme-example/theme.json"),
    # the real files the Android app loads
    ("content/schemas/games.app.schema.json", "app/src/main/assets/games.json"),
    ("content/schemas/games.app.schema.json", "app/src/main/assets/catalogue_games.json"),
    ("content/schemas/try-activities.app.schema.json", "app/src/main/assets/try_activities.json"),
]
errors = []
for schema_rel, example_rel in pairs:
    try:
        schema = json.loads((ROOT / schema_rel).read_text(encoding="utf-8"))
        example = json.loads((ROOT / example_rel).read_text(encoding="utf-8"))
        Draft202012Validator.check_schema(schema)
        issues = sorted(Draft202012Validator(schema).iter_errors(example), key=lambda e: list(e.path))
        if issues:
            for issue in issues:
                where = ".".join(str(x) for x in issue.path) or "<root>"
                errors.append(f"{example_rel}:{where}: {issue.message}")
        else:
            print(f"PASS {example_rel}")
    except Exception as exc:
        errors.append(f"{schema_rel} / {example_rel}: {exc}")
if errors:
    for error in errors:
        print(f"FAIL {error}")
    sys.exit(1)
print(f"Validated {len(pairs)} files.")
