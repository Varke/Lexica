import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Фиксируем корень проекта: рядом есть другие lockfile-ы, и Next иначе
  // ошибочно выбирает родительскую папку как workspace root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
