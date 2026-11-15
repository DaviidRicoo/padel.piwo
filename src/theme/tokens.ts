// Generated from replica/design/tokens.json by replica/design/build_tokens.py.
// Do not edit by hand: change tokens.json and run the script again.

export const tokens = {
  "color": {
    "light": {
      "bg": "#F2F4F7",
      "surface": "#FFFFFF",
      "surface2": "#EAEEF3",
      "border": "#DFE4EB",
      "borderInput": "#74808F",
      "text": "#0F2B44",
      "textMuted": "#4A5D72",
      "accent": "#11334F",
      "onAccent": "#FFFFFF",
      "accentText": "#11334F",
      "accentSoft": "#E3EAF2",
      "gold": "#C79649",
      "onGold": "#11334F",
      "goldText": "#7A571B",
      "goldSoft": "#F6ECDC",
      "sage": "#8BB1A4",
      "onSage": "#11334F",
      "sageText": "#365F52",
      "sageSoft": "#E2EEEA",
      "danger": "#B42318",
      "onDanger": "#FFFFFF",
      "dangerSoft": "#FBE6E4",
      "success": "#1A6E44",
      "onSuccess": "#FFFFFF",
      "successSoft": "#E1F2E9",
      "warning": "#845700",
      "warningSoft": "#FBF0D9",
      "focus": "#11334F",
      "scrim": "#0B1F33",
      "brand": "#11334F",
      "onBrand": "#FFFFFF"
    },
    "dark": {
      "bg": "#0B2135",
      "surface": "#132E48",
      "surface2": "#1B3A57",
      "border": "#24466A",
      "borderInput": "#8AA3BC",
      "text": "#FFFFFF",
      "textMuted": "#B7C6D6",
      "accent": "#C79649",
      "onAccent": "#11334F",
      "accentText": "#DDB46E",
      "accentSoft": "#43392B",
      "gold": "#C79649",
      "onGold": "#11334F",
      "goldText": "#DDB46E",
      "goldSoft": "#43392B",
      "sage": "#8BB1A4",
      "onSage": "#11334F",
      "sageText": "#A5CCBE",
      "sageSoft": "#24435A",
      "danger": "#FF8A7A",
      "onDanger": "#11334F",
      "dangerSoft": "#393D50",
      "success": "#6ED3A1",
      "onSuccess": "#11334F",
      "successSoft": "#1F4554",
      "warning": "#F2C46B",
      "warningSoft": "#37464E",
      "focus": "#DDB46E",
      "scrim": "#000000",
      "brand": "#11334F",
      "onBrand": "#FFFFFF"
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
      "family": "sans",
      "tracking": 0
    },
    "label": {
      "size": 15,
      "line": 20,
      "weight": 600,
      "family": "sans",
      "tracking": -0.2
    },
    "bodySm": {
      "size": 14,
      "line": 20,
      "weight": 400,
      "family": "sans",
      "tracking": -0.1
    },
    "body": {
      "size": 16,
      "line": 24,
      "weight": 400,
      "family": "sans",
      "tracking": -0.2
    },
    "heading": {
      "size": 17,
      "line": 22,
      "weight": 600,
      "family": "sans",
      "tracking": -0.3
    },
    "title": {
      "size": 21,
      "line": 26,
      "weight": 700,
      "family": "sans",
      "tracking": -0.4
    },
    "display": {
      "size": 30,
      "line": 36,
      "weight": 700,
      "family": "sans",
      "tracking": -0.8
    },
    "brand": {
      "size": 26,
      "line": 32,
      "weight": 800,
      "family": "display",
      "tracking": -0.2
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
    "lg": 18,
    "xl": 24,
    "pill": 999
  },
  "shadow": {
    "card": {
      "offsetY": 1,
      "blur": 2,
      "opacity": 0.05
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
  "scale": {
    "pressed": 0.97
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
