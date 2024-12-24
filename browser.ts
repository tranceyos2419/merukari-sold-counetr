import { Cluster } from "puppeteer-cluster";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import UserAgent from "user-agents";
import { ProxyInput } from "./interfaces";
import { Page } from "puppeteer";

puppeteer.use(StealthPlugin());

export let cluster: Cluster | null = null;


// Initializes the Puppeteer cluster with the 5 default concurrency but we can pass.

export const initializeCluster = async (maxConcurrency = 5) => {
	if (cluster) {
		console.log("Cluster is already initialized.");
		return cluster;
	}

	cluster = await Cluster.launch({
		concurrency: Cluster.CONCURRENCY_PAGE,
		maxConcurrency,
		timeout: 120000, // 2 minutes
		puppeteerOptions: {
			headless: true,
			args: [
				"--disable-blink-features=AutomationControlled",
				"--disable-webgl",
				"--disable-webrtc",
				"--disable-dev-shm-usage",
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--window-size=375,667",
				"--no-sandbox",
				// i disbaled it purposely because i got an issue here  https://github.com/puppeteer/puppeteer/issues/11515
				// "--single-process",
				"--disable-gpu",
				"--disable-dev-shm-usage",
				"--disable-setuid-sandbox",
				"--no-first-run",
				"--no-zygote",
				"--proxy-server='direct://'",
				"--proxy-bypass-list=*",
				"--deterministic-fetch",
			],
		},
		retryLimit: 3,
	});

	console.log(`Cluster initialized with ${maxConcurrency} workers.`);
	return cluster;
};


//  Sets up a Puppeteer page
export const setupClusterPage = async (page: Page, proxy?: ProxyInput) => {
	const isProxyActive = process.env.IS_PROXY_ACTIVE === "true";

	if (isProxyActive && proxy) {
		await page.authenticate({
			username: proxy.username,
			password: proxy.password,
		});
	}

	const agent = new UserAgent();
	await page.setUserAgent(agent.toString());

	await page.setViewport({ width: 375, height: 667 }); // Mimic mobile viewport
};


//  Closes the Puppeteer cluster.
export const closeCluster = async () => {
	if (cluster) {
		await cluster.idle();
		await cluster.close();
		console.log("Cluster closed.");
		cluster = null;
	}
};
