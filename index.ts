import * as dotenv from "dotenv";
import path from "path";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import {
	readDataSet,
	readProxiesJson,
	saveData,
	getDate30DaysAgo,
	createNMURL,
	selectRandomProxy,
	calculateMedian,
	millisToMinutes,
	executeWithRetry,
	getName,
	createDefaultOutput,
} from "./helper";
import { CSVInput, CSVOutput, ProxyInput } from "./interfaces";

import { scrapeOMURL, scrapeNMURL } from "./scraper";

puppeteer.use(StealthPlugin());
dotenv.config();

const INPUT_FILE_PATH = path.join(process.cwd(), "input.csv");
const OUTPUT_FILE_PATH = path.join(process.cwd(), "output.csv");
const PROXIES_FILE_PATH = path.join(process.cwd(), "proxies.json");

let inputDataSet: CSVInput[] = [];
let outputDataSet: CSVOutput[] = [];

(async () => {
	console.log("This app is in Action");
	const startTime = performance.now();
	const date30daysBefore = getDate30DaysAgo();
	const comparisonDate = new Date(date30daysBefore);

	try {
		inputDataSet = readDataSet(INPUT_FILE_PATH) as CSVInput[];
		outputDataSet = readDataSet(OUTPUT_FILE_PATH) as CSVOutput[];
		const proxiesDataSet: ProxyInput[] = readProxiesJson(PROXIES_FILE_PATH);

		for (let i = 0; i < inputDataSet.length; i++) {
			const item = inputDataSet[i];
			console.log(`${item?.Identity} (Row ${i + 1}) | The process begins`);

			if ((outputDataSet?.[i]?.Identity ?? "") === item?.Identity) {
				console.log(`${item?.Identity} (Row ${i + 1}) | Skipping this item`);
				continue;
			}

			if (!inputDataSet?.[i]?.OMURL?.includes("jp.mercari.com/search")) {
				console.log(`${item?.Identity} (Row ${i + 1}) | Skipping this item`);
				outputDataSet[i] = createDefaultOutput(item, "Invalid OMURL");
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

			const NMResult = await executeWithRetry(
				() => scrapeNMURL(NMURL, comparisonDate, selectedProxy),
				(error) => console.error("Error during NMURL scraping:", error)
			);

			if (NMResult) {
				MSC = NMResult.MSC;
				MSPC = NMResult.MSPC;
				keyword = NMResult.keyword;
				exclusiveKeyword = NMResult.exclusiveKeyword;
				priceMin = NMResult.priceMin;
				priceMax = NMResult.priceMax;
			} else {
				console.log("Operation failed after retries.");
			}

			const OMResult = await executeWithRetry(
				() => scrapeOMURL(item.OMURL, comparisonDate, selectedProxy),
				(error) => console.error("Error during OMURL scraping:", error)
			);

			if (OMResult) {
				// MSC = items.length; initially in scrapeNMURL function thenn we increment
				MSC += OMResult.MSC;
				prices = OMResult.prices;
			} else {
				console.log("Operation failed after retries.");
			}

			MMP = calculateMedian(prices);

			const MWR = Number((MSPC / MSC).toFixed(2)) ?? 0;
			const MDSR = Number((MSPC / TSC).toFixed(2)) ?? 0;

			const nameParameters = {
				item: item,
				MSPC: MSPC,
				MMP: MMP,
				MSC: MSC,
				MWR: MWR,
			};

			const name = getName(nameParameters);

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

		// check if the row count is the same
		if (inputDataSet.length !== outputDataSet.length) {
			console.error("Row count mismatch between input and output!");
			throw new Error(
				"Output file generation failed due to row count mismatch."
			);
		}

		console.log(`This Execution took ${millisToMinutes(endTime - startTime)}`);
	}
})();
