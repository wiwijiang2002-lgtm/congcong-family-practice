import original from '../web/tailwind.config';
export default {
  ...original,
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}', '../web/src/**/*.{ts,tsx}'],
};
