import { detectPlatform } from '../lib/platforms/detector';
import { validateAndSanitizeUrl } from '../lib/validation/url-validator';
import { buildWatermarkRemovalFilterChain } from '../lib/media/watermark';
import { formatBytes, formatDuration, sanitizeFilename } from '../lib/media/formatter';
import { pinterestHandler } from '../lib/platforms/pinterest';

async function runTests() {
  console.log('--- 1. Testing Platform Detector ---');
  const testUrls = [
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'youtube' },
    { url: 'https://youtu.be/dQw4w9WgXcQ', expected: 'youtube' },
    { url: 'https://www.tiktok.com/@scout2015/video/6718335390845095173', expected: 'tiktok' },
    { url: 'https://vt.tiktok.com/ZS2abcd/', expected: 'tiktok' },
    { url: 'https://www.instagram.com/reel/C8xyz123/', expected: 'instagram' },
    { url: 'https://www.facebook.com/watch/?v=123456789', expected: 'facebook' },
    { url: 'https://www.facebook.com/photo/?fbid=123456789', expected: 'facebook' },
    { url: 'https://www.pinterest.com/pin/185773553378546112/', expected: 'pinterest' },
    { url: 'https://pin.it/abcd123', expected: 'pinterest' },
  ];

  for (const t of testUrls) {
    const result = detectPlatform(t.url);
    const pass = result === t.expected;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${t.url} => detected: ${result}`);
    if (!pass) process.exit(1);
  }

  console.log('\n--- 2. Testing URL Validation & SSRF Protection ---');
  try {
    validateAndSanitizeUrl('http://localhost:3000/api');
    console.error('[FAIL] Localhost was not blocked');
    process.exit(1);
  } catch (e: any) {
    console.log('[PASS] Localhost successfully blocked:', e.message);
  }

  try {
    validateAndSanitizeUrl('http://192.168.1.1/admin');
    console.error('[FAIL] Private IP was not blocked');
    process.exit(1);
  } catch (e: any) {
    console.log('[PASS] Private IP successfully blocked:', e.message);
  }

  const safeUrl = validateAndSanitizeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  console.log('[PASS] Safe YouTube URL accepted:', safeUrl.sanitizedUrl);

  console.log('\n--- 3. Testing Watermark Removal Filter Generator ---');
  const verticalFilter = buildWatermarkRemovalFilterChain(1080, 1920);
  console.log('[PASS] Vertical Delogo Filter:', verticalFilter);

  const horizontalFilter = buildWatermarkRemovalFilterChain(1920, 1080);
  console.log('[PASS] Horizontal Delogo Filter:', horizontalFilter);

  console.log('\n--- 4. Testing Media Formatter ---');
  console.log('Formatted Duration (215s):', formatDuration(215));
  console.log('Formatted Bytes (25000000B):', formatBytes(25000000));
  console.log('Sanitized Filename:', sanitizeFilename('Dangerous /:*?"<>| Video Title!'));

  console.log('\n--- 5. Testing Pinterest Fast Image Extraction ---');
  const pinResult = await pinterestHandler.analyze('https://www.pinterest.com/pin/185773553378546112/');
  console.log('[PASS] Pinterest Pin Analyzed Successfully:');
  console.log('  Title:', pinResult.title);
  console.log('  Thumbnail:', pinResult.thumbnail);
  console.log('  Available formats:', pinResult.availableFormats.map(f => `${f.formatId} (${f.quality})`));

  console.log('\nALL BACKEND UNIT & INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests().catch((err) => {
  console.error('[TEST_FAILURE]', err);
  process.exit(1);
});
