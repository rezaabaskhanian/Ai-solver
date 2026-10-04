/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  webpack: (config) => {
    // pdfjs-dist اختیاراً به پکیج node «canvas» ارجاع می‌دهد؛ در مرورگر لازم نیست.
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};

export default nextConfig;
