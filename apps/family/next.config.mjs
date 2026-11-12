/** Independent static demo: no upstream content pipeline or remote fonts. */
const basePath=process.env.FAMILY_BASE_PATH?.replace(/\/$/,'')??'';
if(basePath&&!/^(\/[A-Za-z0-9._-]+)+$/.test(basePath))throw new Error('Invalid FAMILY_BASE_PATH');
export default {
  basePath,
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ['@cstf/core'],
  experimental: { cpus: 2 },
};
