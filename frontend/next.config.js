const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React strict mode
    reactStrictMode: true,

    // Disable TypeScript build errors (for now)
    typescript: {
        ignoreBuildErrors: false,
    },
    // Force Next/Turbopack to resolve the workspace from this frontend package.
    turbopack: {
        root: path.resolve(__dirname),
    },
};

module.exports = nextConfig;
