import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";
import Papa from 'papaparse';
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { CSVInput, CSVOutput, ProxyInput, ScrapedCondition, ScrapedItem } from "./interfaces";
import launchUniqueBrowser from "./browser";

puppeteer.use(StealthPlugin());
dotenv.config();

const INPUT_FILE_PATH = path.join(process.cwd(), "input.csv");
const OUTPUT_FILE_PATH = path.join(process.cwd(), "output.csv");
const PROXIES_FILE_PATH = path.join(process.cwd(), "proxies.json");


const readDataSet = (filePath: string): CSVInput[] | CSVOutput[] => {
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

// Reading a JSON file
const readProxiesJson = (filePath: string): ProxyInput[] => {
  const result = new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject('Error reading the file: ' + err);
        return;
      }

      try {
        const proxies = JSON.parse(data);
        resolve(proxies);
      } catch (parseError) {
        reject('Error parsing JSON: ' + parseError);
      }
    });
  }) as unknown as ProxyInput[];
  return result
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
function createNMURL(omurl: string, sp: number): string {
  const price_max = sp.toString();
  const parsedPrice_max = price_max.slice(1).replace(/\,/g, "");
  const url = new URL(omurl);

  url.searchParams.set("price_max", parsedPrice_max);
  url.searchParams.set("status", "sold_out");
  url.searchParams.set("order", "desc");
  url.searchParams.set("sort", "created_time");
  return url.toString();
}

function selectRandomProxy(arr: ProxyInput[]): ProxyInput {
  const selected = arr[Math.floor(Math.random() * arr.length)];
  return selected
}

export const calculateMedian = (numbers: number[]): number => {
  const sorted = Array.from(numbers).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
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
(async () => {
  console.log("This app is in Action");
  const startTime = performance.now()
  const date30daysBefore = getDate30DaysAgo();
  const comparisonDate = new Date(date30daysBefore);

  try {
    const inputDataSet: CSVInput[] = await readDataSet(INPUT_FILE_PATH) as CSVInput[];
    const outputDataSet: CSVOutput[] = await readDataSet(OUTPUT_FILE_PATH) as CSVOutput[];
    const proxiesDataSet: ProxyInput[] = await readProxiesJson(PROXIES_FILE_PATH);

    console.log(`the number of input read data: ${inputDataSet.length}`)
    console.log(`the number of output read data: ${outputDataSet.length}`)
    console.log(`the number of proxies: ${proxiesDataSet.length}`)

    for (let i = 0; i < inputDataSet.length; i++) {
      const item = inputDataSet[i];
      console.log(`${item?.Identity} (Row ${i + 1}) | The process begins`)

      // If Identities the same in the input file and the output file , skip the row
      if ((outputDataSet?.[i]?.Identity ?? "") === item?.Identity) {
        console.log(`${item?.Identity} (Row ${i + 1} | Skipping this item`)
        continue;
      }

      // If a URL is wrong, skip the row
      if (!(inputDataSet?.[i]?.OMURL.includes("jp.mercari.com/search"))) {
        console.log(`${item?.Identity} (Row ${i + 1} | Skipping this item`)
        continue;
      }

      let MSC = 0;
      let MSPC = 0;
      let MMP = 0;
      let keyword = "";
      let exclusiveKeyword = "";
      let priceMin = NaN;
      let priceMax = NaN;
      let prices: number[] = []

      const NMURL = createNMURL(item.OMURL, item.SP);

      //# NMURL FLow
      const selectedProxy = selectRandomProxy(proxiesDataSet)

      const { browser: browserNMURL, page: pageNMURL } = await launchUniqueBrowser(selectedProxy);

      // Get parameters from entities:search json
      pageNMURL.on("response", async (response) => {
        const requestUrl = response.url();
        if (requestUrl.includes("https://api.mercari.jp/v2/entities:search")) {
          try {
            const jsonResponse = await response.json();

            const items: ScrapedItem[] = jsonResponse.items.filter(
              (item: ScrapedItem) => item.status === "ITEM_STATUS_SOLD_OUT"
            );

            // Filter duplicates
            const uniqueItems = items.filter((item, index, self) => index === self.findIndex((t) => t.id === item.id));

            // Calculate MSPC
            if (uniqueItems.length > 0) {
              for (const item of uniqueItems) {
                const itemUpdatedDate = new Date(convertTimestampToDate(item.updated));
                // Checking if "updated" time is before 30 days
                if (itemUpdatedDate >= comparisonDate) {
                  MSPC = MSPC + 1;
                }
              }
            }

            // Get search condition
            const scrapedCondition = jsonResponse.searchCondition as ScrapedCondition;
            keyword = scrapedCondition.keyword.split(" ").filter(part => part !== "").join(",");
            exclusiveKeyword = scrapedCondition.excludeKeyword.split(" ").filter(part => part !== "").join("|");
            priceMin = parseInt(scrapedCondition.priceMin)
            priceMax = parseInt(scrapedCondition.priceMax)

          } catch (error) {
            console.warn("Issue parsing JSON response " + error);
          }
        }
      });

      await pageNMURL.goto(NMURL, { waitUntil: "networkidle2", timeout: 300000 });
      await browserNMURL.close();


      //# OMURL Flow
      const { browser: browserOMURL, page: pageOMURL } = await launchUniqueBrowser(selectedProxy);

      // Get parameters from entities:search json
      pageOMURL.on("response", async (response) => {
        const requestUrl = response.url();
        if (requestUrl.includes("https://api.mercari.jp/v2/entities:search")) {
          try {
            const jsonResponse = await response.json();

            const items: ScrapedItem[] = jsonResponse.items.filter(
              (item: ScrapedItem) => item.status === "ITEM_STATUS_SOLD_OUT"
            );

            // Filter duplicates
            const uniqueItems = items.filter((item, index, self) => index === self.findIndex((t) => t.id === item.id));

            // Calculate MMP
            if (uniqueItems.length > 0) {
              for (const item of uniqueItems) {
                const itemUpdatedDate = new Date(convertTimestampToDate(item.updated));
                // Checking if "updated" time is before 30 days
                if (itemUpdatedDate >= comparisonDate) {
                  MSC = MSC + 1;
                  prices.push(parseInt(item.price))
                }
              }
            }

          } catch (error) {
            console.warn("Issue parsing JSON response " + error);
          }
        }
      });

      await pageOMURL.goto(item.OMURL, { waitUntil: "networkidle2", timeout: 300000 });
      await browserOMURL.close();

      // Calculate MMP
      MMP = calculateMedian(prices)


      const MWR = Number((MSPC / MSC).toFixed(2)) ?? 0;

      const name = `${item.Identity} | ${item.Keyword} | SP:${item.SP} | MSPC:${MSPC} | MMP:${MMP.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })} | MSC:${MSC} | MWR:${MWR} | FMP:${item.FMP} | TSC:${item.TSC}`;

      const memo = `${item.OMURL} ${item.OYURL} ${item.TURL} ${item.CCURL} ${item.PURL}`

      const outputData: CSVOutput = {
        ...item,
        MSC,
        MMP,
        NMURL,
        MSPC,
        MWR,
        name,
        switchAll: 'TRUE',
        kws: keyword,
        kwes: exclusiveKeyword,
        pmin: priceMin,
        pmax: priceMax,
        sve: undefined,
        nickname: undefined,
        nicknameExs: undefined,
        itemStatuses: '2,3,4,5',
        freeShipping: undefined,
        kwsTitle: keyword,
        kwesTitle: exclusiveKeyword,
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
        memo: memo
      }
      outputDataSet[i] = outputData;
      saveData(OUTPUT_FILE_PATH, outputDataSet);
      console.log(`${item?.Identity} (Row ${i + 1}) | The process ends`)
    }
  } catch (error) {
    console.error("Error during the scraping process:", error);
  } finally {
  }
  const endTime = performance.now()
  console.log(`This Execution took ${millisToMinutesAndSeconds(endTime - startTime)}`)
})()
