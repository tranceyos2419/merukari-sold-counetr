import launchUniqueBrowser from "./browser";
import {
	ScrapedItem,
	ScrapedOMURLResult,
	ProxyInput,
	ScrapeNMResult,
	ScrapedCondition,
} from "./interfaces";

import { convertTimestampToDate } from "./helper";

export const scrapeOMURL = async (
	url: string,
	comparisonDate: Date,
	selectedProxy: ProxyInput
): Promise<ScrapedOMURLResult> => {
	let MSC = 0;
	let prices: number[] = [];
	let retryCount = 0;
	const maxRetries = 3;

	const processResponse = async (response: any) => {
		try {
			if (!response) {
				throw new Error(`Response body is missing`);
			}

			if (response.headers()["content-length"] === "0") {
				return; // No data in the response
			}

			const jsonResponse = await response.json();

			if (!jsonResponse || !jsonResponse.items) {
				throw new Error(`Invalid JSON format: ${JSON.stringify(jsonResponse)}`);
			}

			const items: ScrapedItem[] = jsonResponse.items.filter(
				(item: ScrapedItem) => item.status === "ITEM_STATUS_SOLD_OUT"
			);

			const uniqueItems = items.filter(
				(item, index, self) => index === self.findIndex((t) => t.id === item.id)
			);

			for (const item of uniqueItems) {
				const itemUpdatedDate = new Date(convertTimestampToDate(item.updated));
				if (itemUpdatedDate >= comparisonDate) {
					MSC += 1;
					prices.push(parseInt(item.price ?? "0"));
				}
			}
		} catch (error) {
			console.warn("Issue parsing JSON response: OMURL", error);
		}
	};

	// Helper function to wait for a specified time
	const wait = (ms: number) =>
		new Promise((resolve) => setTimeout(resolve, ms));

	const scrapeWithRetry = async (): Promise<void> => {
		while (retryCount < maxRetries) {
			const { browser: browserOMURL, page: pageOMURL } =
				await launchUniqueBrowser(selectedProxy);

			try {
				// Attach response handler
				pageOMURL.on("response", async (response: any) => {
					const requestUrl = response.url();
					if (
						requestUrl.includes("https://api.mercari.jp/v2/entities:search")
					) {
						await processResponse(response);
					}
				});

				// Navigate to the page
				await pageOMURL.goto(url, {
					waitUntil: "networkidle2",
					timeout: 500000,
				});

				// Check if critical fields are populated
				if (MSC > 0 && prices.length > 0) {
					break; // Exit retry loop if values are valid
				} else {
					console.log(
						`Retry #${retryCount + 1}: Prices or MSC not populated. Retrying...`
					);
					retryCount++;
					await wait(60000); // Wait for a minute before retrying
				}
			} catch (error) {
				console.error(
					`Error during scraping attempt #${retryCount + 1}:`,
					error
				);
				retryCount++;
				await wait(60000); // Wait for 1 minute before retryin
			} finally {
				await browserOMURL.close();
			}
		}
	};

	// Perform scraping with retries
	await scrapeWithRetry();

	// If retries are exhausted and fields are still empty, log and return empty values
	if (MSC === 0 || prices.length === 0) {
		console.log("Retries exhausted. No data retrieved for MSC or prices.");
		MSC = 0;
		prices = [];
	}

	return { MSC, prices };
};


export const scrapeNMURL = async (
	NMURL: string,
	comparisonDate: Date,
	selectedProxy: ProxyInput
): Promise<ScrapeNMResult> => {
	let MSPC = 0;
	let keyword = "";
	let exclusiveKeyword = "";
	let priceMin = 0;
	let priceMax = 0;
	let retryCount = 0;
	const maxRetries = 3;

	const processResponse = async (response: any) => {
		try {
			if (response.headers()["content-length"] === "0") {
				return;
			}

			const text = await response.text();
			const jsonResponse = JSON.parse(text);

			if (!jsonResponse || !jsonResponse.items) {
				throw new Error(
					`Unexpected JSON format: ${JSON.stringify(jsonResponse)}`
				);
			}

			const items: ScrapedItem[] = jsonResponse.items.filter(
				(item: ScrapedItem) => item.status === "ITEM_STATUS_SOLD_OUT"
			);

			const uniqueItems = items.filter(
				(item, index, self) => index === self.findIndex((t) => t.id === item.id)
			);

			if (uniqueItems.length > 0) {
				for (const item of uniqueItems) {
					const itemUpdatedDate = new Date(
						convertTimestampToDate(item.updated)
					);
					if (itemUpdatedDate >= comparisonDate) {
						MSPC += 1;
					}
				}
			}

			const scrapedCondition = jsonResponse.searchCondition as ScrapedCondition;

			if (scrapedCondition) {
				keyword = scrapedCondition.keyword
					? scrapedCondition.keyword
							.split(" ")
							.filter((part) => part !== "")
							.join(",")
					: "";
				exclusiveKeyword = scrapedCondition.excludeKeyword
					? scrapedCondition.excludeKeyword
							.split(" ")
							.filter((part) => part !== "")
							.join("|")
					: "";
				priceMin = parseInt(scrapedCondition.priceMin ?? "0", 10);
				priceMax = parseInt(scrapedCondition.priceMax ?? "0", 10);
			}
		} catch (error) {
			console.error("Issue parsing JSON response: NMURL", error);
		}
	};

	// helpe function to wait for a minute
	const wait = (ms: number) =>
		new Promise((resolve) => setTimeout(resolve, ms));

	const scrapeWithRetry = async (): Promise<void> => {
		while (retryCount < maxRetries) {
			const { browser: browserNMURL, page: pageNMURL } =
				await launchUniqueBrowser(selectedProxy);

			try {
				// attach response handler
				pageNMURL.on("response", async (response: any) => {
					const requestUrl = response.url();
					if (
						requestUrl.includes("https://api.mercari.jp/v2/entities:search")
					) {
						await processResponse(response);
					}
				});

				// Navigate to the page
				await pageNMURL.goto(NMURL, {
					waitUntil: "networkidle2",
					timeout: 500000,
				});

				// Check if critical fields are populated
				if (keyword && exclusiveKeyword && priceMax) {
					break; // Exit retry loop if values are valid
				} else {
					console.log(
						`Retry #${retryCount + 1}: searchCondition is null Retrying...`
					);
					retryCount++;
					await wait(60000); // Wait for 1 minute before retrying
				}
			} catch (error) {
				console.error(
					`Error during scraping attempt #${retryCount + 1}:`,
					error
				);
				retryCount++;
				await wait(60000); // Wait for 1 minute before retrying
			} finally {
				// Close the browser for this iteration
				await browserNMURL.close();
			}
		}
	};

	// Perform scraping with retries
	await scrapeWithRetry();

	// If retries are exhausted and fields are still empty, use default values
	// no need of checking priceMin right sometimes it becomes as 0 thats why checking priceMax is enough
	if (!keyword || !exclusiveKeyword || !priceMax) {
		console.log("Retries exhausted. Using default values for searchCondition.");
		keyword = "";
		exclusiveKeyword = "";
		priceMin = 0;
		priceMax = 0;
	}

	// Return the manipulated values
	return { MSPC, keyword, exclusiveKeyword, priceMin, priceMax };
};
