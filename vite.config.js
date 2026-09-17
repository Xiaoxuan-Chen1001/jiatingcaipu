import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  base: "./", // 加在最外面，为了以后打包部署不会白屏
  plugins: [vue()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [".loca.lt"], // 👈 【新增】加在 server 里面，解决现在的拦截报错
  },
});
