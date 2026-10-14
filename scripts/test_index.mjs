import axios from 'axios';

async function testIndex() {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Sec-Fetch-Mode': 'navigate',
  };

  const res = await axios.get('https://www.facebook.com/itx.rajpootdawood', { headers });
  const html = res.data;
  console.log('Includes is_verified:true ->', html.includes('"is_verified":true'));
  const idx = html.indexOf('"is_verified":true');
  console.log('Index:', idx);
  if (idx !== -1) {
    console.log(html.slice(idx - 100, idx + 150));
  }
}

testIndex();
