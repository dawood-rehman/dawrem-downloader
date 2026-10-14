import axios from 'axios';

async function testAllTargets() {
  const cleanUsername = 'itx.rajpootdawood';
  const desktopHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Sec-Fetch-Mode': 'navigate',
  };

  const targets = [
    { name: 'main', url: `https://www.facebook.com/${cleanUsername}` },
    { name: 'photos', url: `https://www.facebook.com/${cleanUsername}/photos` },
    { name: 'photos_by', url: `https://www.facebook.com/${cleanUsername}/photos_by` },
    { name: 'photos_albums', url: `https://www.facebook.com/${cleanUsername}/photos_albums` },
    { name: 'videos', url: `https://www.facebook.com/${cleanUsername}/videos` },
    { name: 'reels', url: `https://www.facebook.com/${cleanUsername}/reels` },
    { name: 'stories', url: `https://www.facebook.com/stories/${cleanUsername}` },
  ];

  for (const t of targets) {
    try {
      const res = await axios.get(t.url, { headers: desktopHeaders, timeout: 8000 });
      const html = res.data;
      if (html.includes('"is_verified":true')) console.log(`${t.name} -> "is_verified":true`);
      if (html.includes('"verification_status":"blue_verified"')) console.log(`${t.name} -> blue_verified`);
      if (html.includes('aria-label="Verified account"')) console.log(`${t.name} -> Verified account`);
      if (html.includes('aria-label="Verified profile"')) console.log(`${t.name} -> Verified profile`);
      if (html.includes('aria-label="Verified Page"')) console.log(`${t.name} -> Verified Page`);
    } catch (err) {
      console.log(`${t.name} -> Error:`, err.message);
    }
  }
}

testAllTargets();
