import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import puppeteer from "puppeteer";

dotenv.config();

const PROXY_URL = `http://api.scrape.do?token=${process.env.PROXY_TOKEN}&url=https://httpbin.co/ip`;

const INPUT_FILE_PATH = path.resolve(__dirname, "input.csv");
const OUTPUT_FILE_PATH = path.resolve(__dirname, "output.csv");

// Interface for CSV row data
interface CSVRow {
  Keyword: string;  // Added Keyword
  Identity: string;
  OMURL: string;
  SP: number;
  NMURL: string;
  MSC: number;
}

// Interface for scraped item data
interface ScrapedItem {
  id: string;
  name: string;
  status: string;
  updated: string;
}

// Function to get the date 30 days ago
function getDate30DaysAgo(): string {
  const today = new Date();
  today.setDate(today.getDate() - 30);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const date30daysBefore = getDate30DaysAgo();

// Modify NMURL based on parameters
function modifyNMURL(omurl: string, sp: number): string {
  const url = new URL(omurl);
  url.searchParams.set("price_max", sp.toString());
  url.searchParams.set("status", "sold_out");
  url.searchParams.set("order", "desc");
  url.searchParams.set("sort", "created_time");
  return url.toString();
}

// Convert Unix timestamp to ISO date format
function convertTimestampToDate(timestamp: string): string {
  const date = new Date(parseInt(timestamp, 10) * 1000);
  return date.toISOString();
}

// Read CSV file

async function readCSVFile(filePath: string): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const results: CSVRow[] = [];
    let rowNumber = 0;

    if (!fs.existsSync(filePath)) {
      return reject(new Error(`File not found: ${filePath}`));
    }

    const fileStream = fs.createReadStream(filePath);

    // Use csv-parser to process each row
    const csvStream = fileStream.pipe(csv({ separator: "," }));

    csvStream
      .on("data", (row) => {
        rowNumber++;

        try {
          const keyword = row["Keyword"]?.trim();  // Read Keyword
          const identity = row["Identity"]?.trim();
          const omurl = row["OMURL"]?.trim();
          const sp = row["S.P."]?.trim();
          const msc = row["MSC"]?.trim() || "0";

          // Check if essential fields exist
          if (!keyword || !identity || !omurl || !sp) {
            console.log(
              `Row ${rowNumber} skipped due to missing fields: ${JSON.stringify(row)}`
            );
            return;
          }

          // Convert price (S.P.) and MSC to numbers
          const price = parseFloat(sp.replace(/[^\d.-]/g, ""));
          const mscNumber = parseFloat(msc);

          if (isNaN(price)) {
            console.log(`Row ${rowNumber} skipped due to invalid price: ${sp}`);
            return;
          }

          const processedRow: CSVRow = {
            Keyword: keyword,  // Add Keyword to the processed row
            Identity: identity,
            OMURL: omurl,
            SP: price,
            MSC: isNaN(mscNumber) ? 0 : mscNumber,
            NMURL: modifyNMURL(omurl, price),
          };

          results.push(processedRow);
        } catch (error) {
          console.error(`Error processing row ${rowNumber}: ${error.message}`);
        }
      })
      .on("end", () => resolve(results))
      .on("error", (err) => reject(err));
  });
}

// Scrape data
async function scrapeNMURL(nmurl: string): Promise<ScrapedItem[]> {
  const itemsArray: ScrapedItem[] = [];
  const processedItemIds = new Set<string>();
  try {
    const browser = await puppeteer.launch({
      headless: true,
    });

    const page = await browser.newPage();

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
            if (!processedItemIds.has(item.id)) {
              processedItemIds.add(item.id);
              itemsArray.push({
                ...item,
                updated: convertTimestampToDate(item.updated),
              });
            }
          });
        } catch (error) {
          // console.warn("Issue parsing JSON response");
        }
      }
    });

    await page.goto(nmurl, { waitUntil: "networkidle2" });
    await browser.close();

    return itemsArray;
  } catch (error) {
    console.error(`Error scraping ${nmurl}:`, error);
    return [];
  }
}

// Save updated data back to a new CSV file (output.csv)
function saveCSVFile(filePath: string, data: CSVRow[]): void {
  const headers = ["Keyword", "Identity", "OMURL", "S.P.", "NMURL", "MSC"];  // Include Keyword in headers
  const csvContent = [
    headers.join(","),  // Add the header
    ...data.map((item) =>
      [item.Keyword, item.Identity, item.OMURL, `"${item.SP}"`, item.NMURL, item.MSC].join(",")
    ),
  ].join("\n");

  try {
    fs.writeFileSync(filePath, csvContent, "utf8");
    console.log(`CSV file saved successfully as ${filePath}.`);
  } catch (error) {
    console.error("Error writing CSV file:", error);
  }
}

// Initiate the scraping process
async function startScrapingProcess() {
  console.log("This app is in Action");
  try {
    const csvData = await readCSVFile(INPUT_FILE_PATH);
    for (const item of csvData) {
      // Formatting NMURL
      if (!item.NMURL.includes("price_max") || !item.NMURL.includes("status")) {
        item.NMURL = modifyNMURL(item.OMURL, item.SP);
      }

      const items = await scrapeNMURL(item.NMURL);

      if (items.length > 0) {
        // Checking if "updated" time is before 30 days
        for (const itm of items) {
          const itemUpdatedDate = new Date(itm.updated);
          const comparisonDate = new Date(date30daysBefore);

          if (
            itemUpdatedDate >= comparisonDate &&
            itemUpdatedDate <= new Date()
          ) {
            // Increasing MSC of the item
            const index = csvData.findIndex(
              (csvItem) => csvItem.Identity === item.Identity
            );
            if (index > -1) {
              csvData[index].MSC += 1;
            }
          }
        }
      }
      console.log(`Processed NMURL for ${item.Identity}`);
    }
    // Save results to output.csv
    saveCSVFile(OUTPUT_FILE_PATH, csvData);
  } catch (error) {
    console.error("Error during the scraping process:", error);
  }
}

startScrapingProcess();
