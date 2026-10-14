/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.ytimg.com' },
      { protocol: 'https', hostname: '**.youtube.com' },
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: '**.tiktokcdn.com' },
      { protocol: 'https', hostname: '**.pinimg.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
    ],
  },
  serverExternalPackages: ['fluent-ffmpeg', '@ffmpeg-installer/ffmpeg', '@ffprobe-installer/ffprobe', 'yt-dlp-exec'],
};

export default nextConfig;
