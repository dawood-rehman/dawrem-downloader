import axios from 'axios';

async function testAccurateVerif() {
  const desktopHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Sec-Fetch-Mode': 'navigate',
  };

  const users = [
    { username: 'itx.rajpootdawood', fbid: '100041420855726' },
    { username: 'zuck', fbid: '4' },
    { username: 'NASA', fbid: '100044561550831' },
  ];

  for (const u of users) {
    const res = await axios.get(`https://www.facebook.com/${u.username}`, { headers: desktopHeaders });
    const h = res.data;

    const isVerified =
      new RegExp(`"id":"${u.fbid}"[^}]+"is_verified":true`).test(h) ||
      new RegExp(`"id":"${u.fbid}"[^}]+"verification_status":"blue_verified"`).test(h) ||
      new RegExp(`"id":"${u.fbid}"[^}]+"is_verified_page":true`).test(h) ||
      h.includes(`"id":"${u.fbid}","__isProfile":"User","is_verified":true`);

    console.log(`${u.username} (ID: ${u.fbid}) -> isVerified: ${isVerified}`);
  }
}

testAccurateVerif();
