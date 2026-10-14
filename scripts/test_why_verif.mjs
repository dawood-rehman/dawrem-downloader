import axios from 'axios';

async function testAllTabs() {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Sec-Fetch-Mode': 'navigate',
  };

  const tabs = [
    'https://www.facebook.com/itx.rajpootdawood',
    'https://www.facebook.com/itx.rajpootdawood/photos',
    'https://www.facebook.com/itx.rajpootdawood/reels',
    'https://m.facebook.com/itx.rajpootdawood?hpir=1'
  ];

  for (const url of tabs) {
    const r = await axios.get(url, { headers });
    const h = r.data;
    if (h.includes('"is_verified":true')) console.log(url, 'has "is_verified":true');
    if (h.includes('"verification_status":"blue_verified"')) console.log(url, 'has blue_verified');
    if (h.includes('aria-label="Verified account"')) console.log(url, 'has aria Verified account');
    if (h.includes('aria-label="Verified profile"')) console.log(url, 'has aria Verified profile');
    if (h.includes('aria-label="Verified Page"')) console.log(url, 'has aria Verified Page');
  }
}

testAllTabs();
