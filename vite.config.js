import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
    base: "/music-playlist-curator/",
    build: { sourcemap: false },
    plugins: [react()],
});