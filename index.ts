import * as dotenv from "dotenv";
import path from "path";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import {
	readDataSet,
	readProxiesJson,
	saveData,
	getDate30DaysAgo,
	convertTimestampToDate,
	createNMURL,
	selectRandomProxy,
	calculateMedian,
	millisToMinutesAndSeconds,
} from "./helper";git
import {
	CSVInput,
	CSVOutput,
	ProxyInput,
	ScrapedCondition,
	ScrapedItem,
} from "./interfaces";
import launchUniqueBrowser from "./browser";

puppeteer.use(StealthPlugin());
dotenv.config();

const INPUT_FILE_PATH = path.join(process.cwd(), "input.csv");
const OUTPUT_FILE_PATH = path.join(process.cwd(), "output.csv");
const PROXIES_FILE_PATH = path.join(process.cwd(), "proxies.json");
const MAX_RETRIES = 3;

// handling internet issue kinda thing retry mechanism
async function executeWithRetry<T>(
	operation: () => Promise<T>,
	errorHandler: (error: any) => void,
	retryCount: number = MAX_RETRIES
): Promise<T | null> {
	for (let attempt = 1; attempt <= retryCount; attempt++) {
		try {
			return await operation();
		} catch (error) {
			errorHandler(error);
			if (attempt < retryCount) {
				console.log(`Retrying ${attempt} of ${retryCount}...`);
			} else {
				console.error("Max retries reached. Operation failed.");
			}
		}
	}
	return null;
}

(async () => {
	console.log("This app is in Action");
	const startTime = performance.now();
	const date30daysBefore = getDate30DaysAgo();
	const comparisonDate = new Date(date30daysBefore);

	try {
		const inputDataSet: CSVInput[] = (await readDataSet(
			INPUT_FILE_PATH
		)) as CSVInput[];
		const outputDataSet: CSVOutput[] = (await readDataSet(
			OUTPUT_FILE_PATH
		)) as CSVOutput[];
		const proxiesDataSet: ProxyInput[] = await readProxiesJson(
			PROXIES_FILE_PATH
		);

		for (let i = 0; i < inputDataSet.length; i++) {
			const item = inputDataSet[i];
			console.log(`${item?.Identity} (Row ${i + 1}) | The process begins`);

			if ((outputDataSet?.[i]?.Identity ?? "") === item?.Identity) {
				console.log(`${item?.Identity} (Row ${i + 1}) | Skipping this item`);
				continue;
			}

			if (!inputDataSet?.[i]?.OMURL?.includes("jp.mercari.com/search")) {
				console.log(`${item?.Identity} (Row ${i + 1}) | Skipping this item`);
				continue;
			}

			let MSC = 0;
			let MSPC = 0;
			let MMP = 0;
			let TSC = 0;
			let keyword = "";
			let exclusiveKeyword = "";
			let priceMin = NaN;
			let priceMax = NaN;
			let prices: number[] = [];

			TSC = item.Period === 90 ? item.TSC / 3 : item.TSC;

			const NMURL = createNMURL(item.OMURL, item.SP);

			const selectedProxy = selectRandomProxy(proxiesDataSet);

			// Retry mechanism for browser navigation and scraping
			const scrapeNMURL = async () => {
				const { browser: browserNMURL, page: pageNMURL } =
					await launchUniqueBrowser(selectedProxy);

				pageNMURL.on("response", async (response) => {
					const requestUrl = response.url();
					if (
						requestUrl.includes("https://api.mercari.jp/v2/entities:search")
					) {
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
								(item, index, self) =>
									index === self.findIndex((t) => t.id === item.id)
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

							const scrapedCondition =
								jsonResponse.searchCondition as ScrapedCondition;
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
								priceMin = parseInt(scrapedCondition.priceMin ?? "0");
								priceMax = parseInt(scrapedCondition.priceMax ?? "0");
							} else {
								console.warn(
									"searchCondition is missing or invalid, using default values."
								);
								keyword = "";
								exclusiveKeyword = "";
								priceMin = 0;
								priceMax = 0;
							}
						} catch (error) {
							console.error(
								" Issue parsing JSON response: NMURL ",
								error,
								"this is response status",
								response.status()
							);
						}
					}
				});

				await pageNMURL.goto(NMURL, {
					waitUntil: "networkidle2",
					timeout: 500000,
				});
				await browserNMURL.close();
			};

			await executeWithRetry(scrapeNMURL, (error) =>
				console.error("Error during NMURL scraping:", error)
			);

			const scrapeOMURL = async () => {
				const { browser: browserOMURL, page: pageOMURL } =
					await launchUniqueBrowser(selectedProxy);

				pageOMURL.on("response", async (response) => {
					const requestUrl = response.url();
					if (
						requestUrl.includes("https://api.mercari.jp/v2/entities:search")
					) {
						try {
							if (!response) {
								throw new Error(`Response body is missing`);
							}

							if (response.headers()["content-length"] === "0") {
								return;
							}

							const jsonResponse = await response.json();

							if (!jsonResponse || !jsonResponse.items) {
								throw new Error(
									`Unexpected JSON format: ${JSON.stringify(jsonResponse)}`
								);
							}

							const items: ScrapedItem[] = jsonResponse.items.filter(
								(item: ScrapedItem) => item.status === "ITEM_STATUS_SOLD_OUT"
							);

							const uniqueItems = items.filter(
								(item, index, self) =>
									index === self.findIndex((t) => t.id === item.id)
							);

							if (uniqueItems.length > 0) {
								for (const item of uniqueItems) {
									const itemUpdatedDate = new Date(
										convertTimestampToDate(item.updated)
									);
									if (itemUpdatedDate >= comparisonDate) {
										MSC += 1;
										prices.push(parseInt(item.price ?? "0"));
									}
								}
							}
						} catch (error) {
							console.warn(
								"Issue parsing JSON response: OMURL",
								error,
								"This is the RESPONSE status ###################",
								response.status()
							);
						}
					}
				});

				await pageOMURL.goto(item.OMURL, {
					waitUntil: "networkidle2",
					timeout: 500000,
				});
				await browserOMURL.close();
			};

			
			await executeWithRetry(scrapeOMURL, (error) =>
				console.error("Error during OMURL scraping:", error)
			);

			MMP = calculateMedian(prices);

			const MWR = Number((MSPC / MSC).toFixed(2)) ?? 0;
			const MDSR = Number((MSPC / TSC).toFixed(2)) ?? 0;

			const name = `${item.Identity} | ${item.Keyword} | SP:${
				item.SP
			} | MSPC:${MSPC} | MMP:${MMP.toLocaleString("ja-JP", {
				style: "currency",
				currency: "JPY",
			})} | MSC:${MSC} | MWR:${MWR} | FMP:${item.FMP} | TSC${item.Period}:${
				item.TSC
			}`;

			const memo = `${item.OMURL} ${item.OYURL} ${item.TURL} ${item.CCURL} ${item.PURL}`;

			const outputData: CSVOutput = {
				...item,
				MSC,
				MMP,
				NMURL,
				MSPC,
				MWR,
				MDSR,
				name,
				switchAll: "TRUE",
				kws: keyword,
				kwes: exclusiveKeyword,
				pmin: priceMin,
				pmax: priceMax,
				sve: undefined,
				nickname: undefined,
				nicknameExs: undefined,
				itemStatuses: "2,3,4,5",
				freeShipping: undefined,
				kwsTitle: keyword,
				kwesTitle: exclusiveKeyword,
				autoBuy: "FALSE",
				gotoBuy: "FALSE",
				type: "normal",
				target: undefined,
				category: undefined,
				size: undefined,
				brand: undefined,
				sellerId: undefined,
				sellerIdExs: undefined,
				notificationCnt: 0,
				receiveCnt: 0,
				openCnt: 0,
				buyCnt: undefined,
				buyPrice: undefined,
				autoBuyTryCnt: 0,
				autoBuySuccessCnt: 0,
				autoMoveTryCnt: 0,
				autoMoveSuccessCnt: 0,
				tags: item.Identity,
				memo: memo,
			};

			outputDataSet[i] = outputData;
			saveData(OUTPUT_FILE_PATH, outputDataSet);
			console.log(`${item?.Identity} (Row ${i + 1}) | The process ends`);
		}
	} catch (error) {
		console.error("Error during the scraping process:", error);
	} finally {
		const endTime = performance.now();
		console.log(
			`This Execution took ${millisToMinutesAndSeconds(endTime - startTime)}`
		);
	}
})();