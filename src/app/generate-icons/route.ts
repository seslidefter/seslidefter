import { NextResponse } from "next/server";

/** Geçici: gradient + 📒 SVG önizleme (PWA için asıl dosya `public/icon.svg`) */
export async function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1B5E20"/>
        <stop offset="100%" style="stop-color:#43A047"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="112" fill="url(#bg)"/>
    <text x="256" y="340" font-size="280" text-anchor="middle" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji">📒</text>
  </svg>`;

  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  });
}
