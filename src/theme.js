// src/theme.js —— 主题色管理
import { ref } from "vue";

// 当前主题色（响应式），从 localStorage 读，没有则用默认橙
export const themeColor = ref(localStorage.getItem("themeColor") || "#ff7a45");

// 预设色板
export const PRESET_COLORS = [
  "#ff7a45", // 暖橙（默认）
  "#f56c6c", // 番茄红
  "#e6a23c", // 琥珀
  "#67c23a", // 草绿
  "#20c997", // 青碧
  "#409eff", // 天空蓝
  "#9254de", // 紫罗兰
  "#eb2f96", // 玫瑰
];

// hex → hsl
function hexToHsl(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// 应用主题色：设置 CSS 变量 + 保存到 localStorage
export function applyThemeColor(hex) {
  themeColor.value = hex;

  const { h, s, l } = hexToHsl(hex);
  // 限定亮度范围，防止用户选了过亮/过暗导致按钮看不清
  const safeL = Math.min(Math.max(l, 45), 68);

  const root = document.documentElement;
  root.style.setProperty("--brand-h", h);
  root.style.setProperty("--brand-s", s + "%");
  root.style.setProperty("--brand-l", safeL + "%");

  localStorage.setItem("themeColor", hex);
}

// 启动时加载已保存的主题色
export function loadThemeColor() {
  applyThemeColor(themeColor.value);
}
