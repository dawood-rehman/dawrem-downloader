export type ProfilePlatform = 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'pinterest';

export type ProfileContentType =
  | 'all'
  | 'video'
  | 'image'
  | 'reel'
  | 'story'
  | 'highlight'
  | 'post'
  | 'pin';

export interface ProfileMediaItem {
  id: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  mediaType: 'video' | 'image' | 'reel' | 'story' | 'highlight' | 'post' | 'pin';
  duration?: number;
  durationFormatted?: string;
  viewCount?: number;
  likeCount?: number;
  uploadDate?: string;
  description?: string;
  directDownloadUrl?: string;
  author?: string;
}

export interface UserProfileInfo {
  platform: ProfilePlatform;
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  mediaCount?: number;
  isPrivate: boolean;
  isVerified?: boolean;
  profileUrl: string;
}

export interface ProfileFetchResult {
  profile: UserProfileInfo;
  items: ProfileMediaItem[];
  nextCursor?: string | number;
  hasMore: boolean;
  totalAvailable?: number;
  warning?: string;
}

export interface ProfileFetchOptions {
  query: string; // username, @handle, or full URL
  platform?: ProfilePlatform;
  cursor?: number | string;
  limit?: number;
  contentType?: ProfileContentType;
  sessionCookie?: string; // Optional user-provided session cookie for private accounts
}
