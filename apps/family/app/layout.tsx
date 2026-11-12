import type { Metadata, Viewport } from 'next';
import '../../web/src/app/globals.css';
import './family.css';

export const metadata: Metadata = {
  title: '聪聪学堂 · 家庭练习',
  description: '每天一小步，和聪聪一起学习。二年级语数家庭练习。',
  robots: { index: false, follow: false },
  icons: { icon: `${process.env.FAMILY_BASE_PATH?.replace(/\/$/,'')??''}/icon.svg` },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#f5f8f3' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
