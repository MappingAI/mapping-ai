import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 1200 });

const filePath = 'file://' + path.resolve(__dirname, '../assets/images/partiful-invite.html');
await page.goto(filePath);
await new Promise(r => setTimeout(r, 1500)); // wait for fonts to load

// Capture V1
const invite = await page.$('#invite');
await invite.screenshot({ path: path.resolve(__dirname, '../assets/images/partiful-invite-v1.png') });
console.log('Saved V1');

// Switch to V2 and capture
await page.click('#btn-v2');
await new Promise(r => setTimeout(r, 500));
await invite.screenshot({ path: path.resolve(__dirname, '../assets/images/partiful-invite-v2.png') });

console.log('Saved V2 to assets/images/partiful-invite-v2.png');
await browser.close();
