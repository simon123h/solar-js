import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => {
  const basePath = process.env.VITE_BASE_PATH;

  return {
    plugins: [vue()],
    root: ".",
    base: basePath ? `/${basePath}/` : "/",
    build: {
      outDir: "dist", // the directory where the built files will go
      emptyOutDir: true, // clear the output directory before building
    },
    server: {
      open: true, // open the browser automatically when the server starts
    },
  };
});
