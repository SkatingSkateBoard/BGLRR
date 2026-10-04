'use client';

export default function ThemeColor({ color }: { color: string }) {
  return <meta name="theme-color" content={color} />;
}