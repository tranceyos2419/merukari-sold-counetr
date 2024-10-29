import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";
import Papa from 'papaparse';
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { CSVInput, CSVOutput, ScrapedCondition, ScrapedItem } from "./interfaces";
import launchUniqueBrowser from "./browser";

puppeteer.use(StealthPlugin());
dotenv.config();

const INPUT_FILE_PATH = path.join(process.cwd(), "input.csv");
const OUTPUT_FILE_PATH = path.join(process.cwd(), "output.csv");


const readData = (filePath: string): CSVInput[] | CSVOutput[] => {
  let parsedData: CSVInput[] | CSVOutput[] = [];
  try {
    const csvData = fs.readFileSync(filePath, "utf-8");
    parsedData = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    }).data;
  } catch (err) {
    console.error(`Reading an input file: ${err}`);
  }
  console.log(`Read data from: ${filePath}`);
  return parsedData;
};

const saveData = (filePath: string, data: CSVOutput[]) => {
  const finalData = Papa.unparse(data);
  fs.writeFileSync(filePath, finalData);
  console.log(`Saved data to: ${filePath} `);
};

// Function to get the date 30 days ago
function getDate30DaysAgo(): string {
  const today = new Date();
  today.setDate(today.getDate() - 30);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Convert Unix timestamp to ISO date format
function convertTimestampToDate(timestamp: string): string {
  const date = new Date(parseInt(timestamp, 10) * 1000);
  return date.toISOString();
}

// Modify NMURL based on parameters
function modifyNMURL(omurl: string, sp: number): string {
  const url = new URL(omurl);
  url.searchParams.set("price_max", sp.toString());
  url.searchParams.set("status", "sold_out");
  url.searchParams.set("order", "desc");
  url.searchParams.set("sort", "created_time");
  return url.toString();
}

function millisToMinutesAndSeconds(millis: number) {
  var minutes = Math.floor(millis / 60000);
  var seconds = ((millis % 60000) / 1000);
  return (
    seconds == 60 ?
      (minutes + 1) + ":00" :
      minutes + ":" + (seconds < 10 ? "0" : "") + seconds.toFixed(0)
  );
}


// Initiate the scraping process
async function main() {
  try {
    const csvData = await readData(INPUT_FILE_PATH) as CSVInput[];
    const outputDataSet: CSVOutput[] = [];

    for (const item of csvData) {
      item.NMURL = modifyNMURL(item.OMURL, item.SP);
      const products: ScrapedItem[] = [];
      const productsId = new Set<string>();

      let scrapedCondition: ScrapedCondition = {
        keyword: "",
        excludeKeyword: "",
        priceMin: NaN,
        priceMax: NaN,
      }

      const { browser, page } = await launchUniqueBrowser();

      // Get parameters from entities:search json
      page.on("response", async (response) => {
        const requestUrl = response.url();
        if (requestUrl.includes("https://api.mercari.jp/v2/entities:search")) {
          try {
            const jsonResponse = await response.json();

            const items: ScrapedItem[] = jsonResponse.items.filter(
              (item: ScrapedItem) => item.status === "ITEM_STATUS_SOLD_OUT"
            );

            // Filter out duplicates
            items.forEach((item: ScrapedItem) => {
              if (!productsId.has(item.id)) {
                productsId.add(item.id);
                products.push({
                  ...item,
                  updated: convertTimestampToDate(item.updated),
                });
              }
            });

            // Get search condition
            scrapedCondition = jsonResponse.searchCondition;
            scrapedCondition.keyword = scrapedCondition.keyword.split(" ").filter(part => part !== "").join(",");
            scrapedCondition.excludeKeyword = scrapedCondition.excludeKeyword.split(" ").filter(part => part !== "").join("|");

          } catch (error) {
            console.warn("Issue parsing JSON response " + error);
          }
        }
      });

      await page.goto(item.NMURL, { waitUntil: "networkidle2", timeout: 300000 });
      await browser.close();

      // Calculate MSC
      if (products.length > 0) {
        item.MSC = 0;
        // Checking if "updated" time is before 30 days
        for (const product of products) {
          const itemUpdatedDate = new Date(product.updated);
          if (itemUpdatedDate >= comparisonDate) {
            item.MSC = item.MSC + 1;
          }
        }
      }

      const name = `${item.Identity} | ${item.Keyword} | SP:${item.SP} | MSC: ${item.MSC}`;

      const outputData: CSVOutput = {
        ...item,
        name: name,
        switchAll: 'TRUE',
        kws: scrapedCondition.keyword,
        kwes: scrapedCondition.excludeKeyword,
        pmin: scrapedCondition.priceMin,
        pmax: scrapedCondition.priceMax,
        sve: undefined,
        nickname: undefined,
        nicknameExs: undefined,
        itemStatuses: '2,3,4,5',
        freeShipping: undefined,
        kwsTitle: scrapedCondition.keyword,
        kwesTitle: scrapedCondition.excludeKeyword,
        autoBuy: 'FALSE',
        gotoBuy: 'FALSE',
        type: 'normal',
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
        memo: item.OMURL
      }
      outputDataSet.push(outputData);
    }
    saveData(OUTPUT_FILE_PATH, outputDataSet);
  } catch (error) {
    console.error("Error during the scraping process:", error);
  }
}

console.log("This app is in Action");
const startTime = performance.now()
const date30daysBefore = getDate30DaysAgo();
const comparisonDate = new Date(date30daysBefore);

main(); // main logic

const endTime = performance.now()
console.log(`This Execution took ${millisToMinutesAndSeconds(endTime - startTime)}`)
