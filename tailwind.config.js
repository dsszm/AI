/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // 品牌色系
        brand: {
          primary: "#1E3A5F",   // 深蓝 主色
          secondary: "#4A6FA5", // 灰蓝 辅色
          accent: "#0066FF",    // 科技蓝 强调色
        },
        // 背景层级
        surface: {
          base: "#0F172A",      // 主背景 深灰蓝
          card: "#1E293B",      // 卡片 稍浅灰蓝
          raised: "#273449",    // 抬升层
        },
        // 功能色
        success: "#10B981",
        danger: "#EF4444",
        warning: "#F59E0B",
        // 对话气泡
        bubble: {
          user: "#0066FF",
          ai: "#1E293B",
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', "system-ui", "sans-serif"],
        display: ['"Orbitron"', '"Noto Sans SC"', "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        glow: "0 0 20px 0 rgba(0, 102, 255, 0.35)",
        "glow-lg": "0 0 40px 0 rgba(0, 102, 255, 0.45)",
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "fade-in": "fadeIn 300ms ease-out",
        "slide-up": "slideUp 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-in": "slideIn 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "blink": "blink 1s step-end infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
