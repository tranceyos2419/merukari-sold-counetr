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

	const { browser: browserOMURL, page: pageOMURL } = await launchUniqueBrowser(
		selectedProxy
	);

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

	pageOMURL.on("response", async (response: any) => {
		const requestUrl = response.url();
		if (requestUrl.includes("https://api.mercari.jp/v2/entities:search")) {
			await processResponse(response);
		}
	});

	await pageOMURL.goto(url, {
		waitUntil: "networkidle2",
		timeout: 500000,
	});

	await browserOMURL.close();

	return { MSC, prices };
};

export const scrapeNMURL = async (
	NMURL: string,
	comparisonDate: Date,
	selectedProxy: ProxyInput
): Promise<ScrapeNMResult> => {
	let MSC = 0;
	let MSPC = 0;
	let keyword = "";
	let exclusiveKeyword = "";
	let priceMin = 0;
	let priceMax = 0;

	const { browser: browserNMURL, page: pageNMURL } = await launchUniqueBrowser(
		selectedProxy
	);

	const processResponse = async (response: any) => {
		try {
			if (response.headers()["content-length"] === "0") {
				return; // No data in the response
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

			MSC = items.length;

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

			// If searchCondition is null, put default values
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
			} else {
				console.log("searchCondition is null, using default values.");
			}
		} catch (error) {
			console.error("Issue parsing JSON response: NMURL", error);
		}
	};

	// Attach response handler
	pageNMURL.on("response", async (response: any) => {
		const requestUrl = response.url();
		if (requestUrl.includes("https://api.mercari.jp/v2/entities:search")) {
			await processResponse(response);
		}
	});

	// Navigate to the page
	await pageNMURL.goto(NMURL, {
		waitUntil: "networkidle2",
		timeout: 500000,
	});

	// Close the browser
	await browserNMURL.close();

	// Return the manipulated values
	return { MSC, MSPC, keyword, exclusiveKeyword, priceMin, priceMax };
};
