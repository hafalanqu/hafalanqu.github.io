// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./js/**/*.js", // <-- Tambahkan ini agar JS juga dipindai
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}