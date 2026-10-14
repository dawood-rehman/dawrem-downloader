import axios from 'axios';

async function checkCombined() {
  const cleanUsername = 'itx.rajpootdawood';
  const desktopHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Sec-Fetch-Mode': 'navigate',
  };
  const mobileHeaders = {
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    'Cookie': 'm_pixel_ratio=2.0; wd=414x896',
  };

  const targets = [
    { name: 'main', url: `https://www.facebook.com/${cleanUsername}`, headers: desktopHeaders },
    { name: 'photos', url: `https://www.facebook.com/${cleanUsername}/photos`, headers: desktopHeaders },
    { name: 'photos_by', url: `https://www.facebook.com/${cleanUsername}/photos_by`, headers: desktopHeaders },
    { name: 'photos_albums', url: `https://www.facebook.com/${cleanUsername}/photos_albums`, headers: desktopHeaders },
    { name: 'videos', url: `https://www.facebook.com/${cleanUsername}/videos`, headers: desktopHeaders },
    { name: 'reels', url: `https://www.facebook.com/${cleanUsername}/reels`, headers: desktopHeaders },
    { name: 'stories', url: `https://www.facebook.com/stories/${cleanUsername}`, headers: desktopHeaders },
    { name: 'mobile', url: `https://m.facebook.com/${cleanUsername}?hpir=1`, headers: mobileHeaders },
  ];

  const responses = await Promise.allSettled(targets.map(t => axios.get(t.url, { headers: t.headers, timeout: 8000 })));
  
  responses.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      const h = String(r.value.data);
      const m1 = h.includes('"is_verified":true');
      const m2 = h.includes('"verification_status":"blue_verified"');
      const m3 = h.includes('aria-label="Verified account"');
      const m4 = h.includes('aria-label="Verified profile"');
      const m5 = h.includes('aria-label="Verified Page"');
      if (m1 || m2 || m3 || m4 || m5) {
        console.log(`TARGET [${targets[i].name}] MATCHED:`, { m1, m2, m3, m4, m5 });
      }
    }
  });
}

checkCombined();
