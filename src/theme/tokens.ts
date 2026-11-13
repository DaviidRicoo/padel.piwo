// Generated from replica/design/tokens.json by replica/design/build_tokens.py.
// Do not edit by hand: change tokens.json and run the script again.

export const tokens = {
  "color": {
    "light": {
      "bg": "#FFFFFF",
      "surface": "#F4F6F9",
      "surface2": "#E8EDF3",
      "border": "#D5DCE5",
      "borderInput": "#74808F",
      "text": "#11334F",
      "textMuted": "#4A5D72",
      "accent": "#11334F",
      "onAccent": "#FFFFFF",
      "accentText": "#11334F",
      "gold": "#C79649",
      "onGold": "#11334F",
      "goldText": "#85601F",
      "sage": "#8BB1A4",
      "onSage": "#11334F",
      "sageText": "#3B6A5B",
      "danger": "#B42318",
      "onDanger": "#FFFFFF",
      "success": "#1E7A4C",
      "onSuccess": "#FFFFFF",
      "warning": "#8F5F00",
      "focus": "#11334F",
      "scrim": "#0B1F33"
    },
    "dark": {
      "bg": "#11334F",
      "surface": "#18405F",
      "surface2": "#1F4C70",
      "border": "#2C5A80",
      "borderInput": "#8AA3BC",
      "text": "#FFFFFF",
      "textMuted": "#BFCCDA",
      "accent": "#C79649",
      "onAccent": "#11334F",
      "accentText": "#DDB46E",
      "gold": "#C79649",
      "onGold": "#11334F",
      "goldText": "#DDB46E",
      "sage": "#8BB1A4",
      "onSage": "#11334F",
      "sageText": "#9CC4B6",
      "danger": "#FF8A7A",
      "onDanger": "#11334F",
      "success": "#6ED3A1",
      "onSuccess": "#11334F",
      "warning": "#F2C46B",
      "focus": "#DDB46E",
      "scrim": "#000000"
    }
  },
  "font": {
    "display": "Montserrat",
    "sans": "Inter"
  },
  "type": {
    "caption": {
      "size": 12,
      "line": 16,
      "weight": 500,
      "family": "sans"
    },
    "label": {
      "size": 14,
      "line": 20,
      "weight": 600,
      "family": "sans"
    },
    "bodySm": {
      "size": 14,
      "line": 20,
      "weight": 400,
      "family": "sans"
    },
    "body": {
      "size": 16,
      "line": 24,
      "weight": 400,
      "family": "sans"
    },
    "heading": {
      "size": 18,
      "line": 24,
      "weight": 700,
      "family": "display"
    },
    "title": {
      "size": 22,
      "line": 28,
      "weight": 700,
      "family": "display"
    },
    "display": {
      "size": 30,
      "line": 36,
      "weight": 800,
      "family": "display"
    }
  },
  "space": {
    "0": 0,
    "1": 4,
    "2": 8,
    "3": 12,
    "4": 16,
    "5": 20,
    "6": 24,
    "8": 32,
    "10": 40,
    "12": 48,
    "16": 64
  },
  "radius": {
    "sm": 8,
    "md": 12,
    "lg": 16,
    "xl": 24,
    "pill": 999
  },
  "shadow": {
    "card": {
      "offsetY": 1,
      "blur": 3,
      "opacity": 0.08
    },
    "pop": {
      "offsetY": 8,
      "blur": 24,
      "opacity": 0.18
    }
  },
  "opacity": {
    "scrim": 0.55,
    "disabled": 0.45,
    "pressed": 0.85
  },
  "motion": {
    "fast": 120,
    "base": 200,
    "slow": 320
  },
  "layout": {
    "gutter": 16,
    "maxContent": 640,
    "touchMin": 44,
    "header": 56,
    "tabBar": 60,
    "controlSm": 36,
    "controlMd": 44,
    "controlLg": 52
  }
} as const;

export type ThemeName = keyof typeof tokens.color;
export type ColorRole = keyof typeof tokens.color.light;
export type TypeVariant = keyof typeof tokens.type;
export type SpaceKey = keyof typeof tokens.space;
export type RadiusKey = keyof typeof tokens.radius;
