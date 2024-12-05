import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import UserAgent from "user-agents";
import { ProxyInput } from "./interfaces";

puppeteer.use(StealthPlugin());

//# To debug ip rotating from proxy
async function getCurrentIP(page) {
  await page.goto('https://api.ipify.org');
  const ip = await page.evaluate(() => document.body.innerText);
  console.log(`Current IP: ${ip}`);
  return ip;
}

const launchUniqueBrowser = async (proxy: ProxyInput
) => {
  const isProxyActive = process.env.IS_PROXY_ACTIVE === 'true';
  const args = [
    '--disable-blink-features=AutomationControlled',
    "--disable-webgl",
    "--disable-webrtc",
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--window-size=375,667"
  ]

  if (isProxyActive) {
    args.push('--proxy-server=' + proxy?.proxyURL)
  }

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args
  })

  const page = await browser.newPage();

  if (isProxyActive) {
    // if your proxy requires authentication
    await page.authenticate({
      username: proxy.username,
      password: proxy.password,
    });
  }

  

  const agent = new UserAgent();
  await page.setUserAgent(agent.toString());

  //# To Check the IP address of the proxy
  // const currentIP = await getCurrentIP(page);

  return { browser, page }
}

export default launchUniqueBrowser