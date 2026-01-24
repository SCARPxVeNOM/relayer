/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React strict mode
    reactStrictMode: true,

    // Disable TypeScript build errors (for now)
    typescript: {
        ignoreBuildErrors: false,
    },
};

module.exports = nextConfig;
