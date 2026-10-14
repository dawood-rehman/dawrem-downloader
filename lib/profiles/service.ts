import { ProfileFetchOptions, ProfileFetchResult } from './types';
import { detectProfileInput } from './detector';
import { fetchYouTubeProfile } from './handlers/youtube';
import { fetchTikTokProfile } from './handlers/tiktok';
import { fetchPinterestProfile } from './handlers/pinterest';
import { fetchFacebookProfile } from './handlers/facebook';
import { fetchInstagramProfile } from './handlers/instagram';

export async function fetchProfileContent(options: ProfileFetchOptions): Promise<ProfileFetchResult> {
  const query = options.query?.trim();
  if (!query) {
    throw new Error('Please enter a username, profile URL, or channel link.');
  }

  const detection = detectProfileInput(query, options.platform);
  const platform = detection.platform || options.platform || 'youtube';

  switch (platform) {
    case 'youtube':
      return await fetchYouTubeProfile(options, detection.normalizedUrl, detection.isPlaylist);

    case 'tiktok':
      return await fetchTikTokProfile(options, detection.normalizedUrl);

    case 'pinterest':
      return await fetchPinterestProfile(options);

    case 'facebook':
      return await fetchFacebookProfile(options);

    case 'instagram':
      return await fetchInstagramProfile(options);

    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
