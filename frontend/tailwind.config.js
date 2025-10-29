import daisyui from "daisyui";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tenorite', 'sans-serif'],
      },
      colors: {
        text: "#190d25",
        background: "#ffffff",
        primary: "#1a1a1a",
        secondary: "#003cff",
        accent: "#00B0F0",
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        mytheme: {
          primary: "#1a1a1a",
          secondary: "#003cff",
          accent: "#00B0F0",
          neutral: "#190d25",
          "base-100": "#ffffff",
        },
      },
    ],
    defaultTheme: "mytheme",
  },
};
