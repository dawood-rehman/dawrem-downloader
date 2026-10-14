import axios from 'axios';

async function inspectIsVerified() {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Sec-Fetch-Mode': 'navigate',
  };

  const res = await axios.get('https://www.facebook.com/itx.rajpootdawood', { headers });
  const html = res.data;
  let pos = 0;
  while (true) {
    const idx = html.indexOf('"is_verified":true', pos);
    if (idx === -1) break;
    console.log(`\nMatch at ${idx}:`);
    console.log(html.slice(Math.max(0, idx - 150), idx + 200));
    pos = idx + 18;
  }
}

inspectIsVerified();
