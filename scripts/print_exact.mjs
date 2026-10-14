import axios from 'axios';

async function printIsVerified() {
  const cleanUsername = 'itx.rajpootdawood';
  const desktopHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Sec-Fetch-Mode': 'navigate',
  };

  const res = await axios.get(`https://www.facebook.com/${cleanUsername}`, { headers: desktopHeaders });
  const html = res.data;
  const idx = html.indexOf('"is_verified":true');
  console.log('Idx:', idx);
  if (idx !== -1) {
    console.log(html.slice(Math.max(0, idx - 150), idx + 200));
  }
}

printIsVerified();
