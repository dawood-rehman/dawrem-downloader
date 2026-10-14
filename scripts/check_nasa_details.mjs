import axios from 'axios';

async function checkNasaDetails() {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Sec-Fetch-Mode': 'navigate',
  };

  const res = await axios.get('https://www.facebook.com/NASA', { headers });
  const html = res.data;

  // Search for verified badge or verified icon
  const matches = [...html.matchAll(/"verification[^"]*":\s*([^,}]+)/gi)].map(m => m[0]);
  console.log('NASA verification fields:', matches);

  const badgeMatches = [...html.matchAll(/"badge[^"]*":\s*([^,}]+)/gi)].map(m => m[0]);
  console.log('NASA badge fields:', badgeMatches.slice(0, 5));

  // Check aria-label
  const ariaMatches = [...html.matchAll(/aria-label="([^"]*verif[^"]*)"/gi)].map(m => m[1]);
  console.log('NASA aria-label matches:', ariaMatches);
}

checkNasaDetails();
