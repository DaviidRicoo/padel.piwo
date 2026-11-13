#!/usr/bin/env python3
"""Generate the token outputs from replica/design/tokens.json. Standard library only.

    python replica/design/build_tokens.py

Writes:
  replica/design/tokens.css   CSS custom properties, light by default and dark under
                              prefers-color-scheme (for the web build, a landing
                              page, or anything outside React Native)
  src/theme/tokens.ts         the typed object the app's components read through
                              useTheme(); never edit it by hand

tokens.json is the only source. replica-brand changes values there, then runs
this script and the contrast check again.
"""

import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SRC = HERE / "tokens.json"
CSS_OUT = HERE / "tokens.css"
TS_OUT = ROOT / "src" / "theme" / "tokens.ts"


def strip_private(obj):
    if isinstance(obj, dict):
        return {k: strip_private(v) for k, v in obj.items() if not k.startswith("_")}
    return obj


def camel(name):
    return re.sub(r"-([a-z0-9])", lambda m: m.group(1).upper(), name)


def camel_keys(obj):
    if isinstance(obj, dict):
        return {camel(k): camel_keys(v) for k, v in obj.items()}
    return obj


def css(tokens):
    lines = ["/* Generated from tokens.json by build_tokens.py. Do not edit. */", ":root {"]
    for role, hexv in tokens["color"]["light"].items():
        lines.append("  --color-%s: %s;" % (role, hexv))
    for name, t in tokens["type"].items():
        fam = tokens["font"][t["family"]]
        lines.append("  --type-%s: %s %spx/%spx \"%s\", system-ui, sans-serif;"
                     % (name, t["weight"], t["size"], t["line"], fam))
    for k, v in tokens["space"].items():
        lines.append("  --space-%s: %spx;" % (k, v))
    for k, v in tokens["radius"].items():
        lines.append("  --radius-%s: %spx;" % (k, v))
    for k, v in tokens["motion"].items():
        lines.append("  --motion-%s: %sms;" % (k, v))
    for k, v in tokens["layout"].items():
        lines.append("  --layout-%s: %spx;" % (k, v))
    lines.append("}")
    lines.append("@media (prefers-color-scheme: dark) {")
    lines.append("  :root:not([data-theme=\"light\"]) {")
    for role, hexv in tokens["color"]["dark"].items():
        lines.append("    --color-%s: %s;" % (role, hexv))
    lines.append("  }")
    lines.append("}")
    lines.append(":root[data-theme=\"dark\"] {")
    for role, hexv in tokens["color"]["dark"].items():
        lines.append("  --color-%s: %s;" % (role, hexv))
    lines.append("}")
    return "\n".join(lines) + "\n"


def ts(tokens):
    data = camel_keys({k: v for k, v in tokens.items() if k != "pairs"})
    body = json.dumps(data, indent=2, ensure_ascii=False)
    return (
        "// Generated from replica/design/tokens.json by replica/design/build_tokens.py.\n"
        "// Do not edit by hand: change tokens.json and run the script again.\n\n"
        "export const tokens = %s as const;\n\n"
        "export type ThemeName = keyof typeof tokens.color;\n"
        "export type ColorRole = keyof typeof tokens.color.light;\n"
        "export type TypeVariant = keyof typeof tokens.type;\n"
        "export type SpaceKey = keyof typeof tokens.space;\n"
        "export type RadiusKey = keyof typeof tokens.radius;\n" % body
    )


def main():
    tokens = strip_private(json.loads(SRC.read_text(encoding="utf-8")))
    light, dark = tokens["color"]["light"], tokens["color"]["dark"]
    if set(light) != set(dark):
        raise SystemExit("light and dark must have the same roles; differ in: %s"
                         % sorted(set(light) ^ set(dark)))
    CSS_OUT.write_text(css(tokens), encoding="utf-8")
    TS_OUT.parent.mkdir(parents=True, exist_ok=True)
    TS_OUT.write_text(ts(tokens), encoding="utf-8")
    print("wrote %s" % CSS_OUT.relative_to(ROOT))
    print("wrote %s" % TS_OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
