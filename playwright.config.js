const {defineConfig, devices} = require('@playwright/test');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8765';
module.exports = defineConfig({
  testDir: './tests',
  timeout: 120000,
  expect: {timeout: 15000},
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', {outputFile: 'tests/results.json'}]],
  use: {baseURL: BASE, trace: 'on-first-retry'},
  projects: [
    {name: 'chromium', use: {browserName: 'chromium', viewport: {width: 1280, height: 800}, launchOptions: {executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader']}}},
    {name: 'webkit-iphone', use: {...devices['iPhone 13'], browserName: 'webkit'}},
    {name: 'firefox', use: {browserName: 'firefox', viewport: {width: 1280, height: 800}}},
  ],
});
