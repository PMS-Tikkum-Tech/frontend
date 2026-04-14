/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Override palet hijau menjadi palet biru IPB agar kelas existing
        // seperti bg-green-600 / text-green-600 otomatis ikut berubah.
        green: {
          50: "#eef5ff",
          100: "#d9e9ff",
          200: "#b8d5ff",
          300: "#8ab9ff",
          400: "#5597ff",
          500: "#2377f5",
          600: "#005BAC",
          700: "#004A8D",
          800: "#003A70",
          900: "#002A52",
          950: "#001A33",
        },
        emerald: {
          50: "#edf4ff",
          100: "#d7e6ff",
          200: "#b4d1ff",
          300: "#86b4ff",
          400: "#4f8dff",
          500: "#2f70e0",
          600: "#1f5bbd",
          700: "#174a98",
          800: "#113b78",
          900: "#0b2a56",
          950: "#071a36",
        },
      },
    },
  },
  plugins: [],
};
