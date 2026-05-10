import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.ra.co' },
      { protocol: 'https', hostname: '**.ra.co' },
      { protocol: 'https', hostname: '**.dice.fm' },
      { protocol: 'https', hostname: 'dice-media.imgix.net' },
      { protocol: 'https', hostname: '**.imgix.net' },
      { protocol: 'https', hostname: 'img.evbuc.com' },
      { protocol: 'https', hostname: '**.evbuc.com' },
      { protocol: 'https', hostname: 'cdn.evbuc.com' },
      { protocol: 'https', hostname: '**.eventbriteapi.com' },
      { protocol: 'https', hostname: 's1.ticketm.net' },
      { protocol: 'https', hostname: '**.ticketm.net' },
      { protocol: 'https', hostname: 's1.bnt.cm' },
      { protocol: 'https', hostname: '**.bnt.cm' },
      { protocol: 'https', hostname: '**.bandsintown.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'maps.googleapis.com' },
      { protocol: 'https', hostname: 'places.googleapis.com' },
    ],
  },
};

export default nextConfig;
