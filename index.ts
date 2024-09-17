import * as dotenv from "dotenv";
import express from "express";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import puppeteer from "puppeteer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

const PROXY_URL = `http://api.scrape.do?token=${process.env.PROXY_TOKEN}&url=https://httpbin.co/ip`;

const FILE_PATH = path.resolve(__dirname, "data.csv");

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
async function readCSVFile(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    let rowNumber = 0;

    if (!fs.existsSync(filePath)) {
      return reject(new Error(`File not found: ${filePath}`));
    }

    fs.createReadStream(filePath)
      .pipe(csv({ separator: "," }))
      .on("data", (row) => {
        rowNumber++;
        try {
          const trimmedRow = Object.keys(row).reduce((acc, key) => {
            acc[key] = row[key].trim();
            return acc;
          }, {} as any);

          if (!trimmedRow["Identity"] || !trimmedRow["OMURL"] || !trimmedRow["S.P."]) {
            console.log(`Row ${rowNumber} skipped due to missing fields: ${JSON.stringify(trimmedRow)}`);
            return;
          }

          const price = parseFloat(trimmedRow["S.P."].replace(/[^\d.-]/g, ""));
          if (isNaN(price)) {
            console.log(`Row ${rowNumber} skipped due to invalid price: ${JSON.stringify(trimmedRow)}`);
            return;
          }

          const processedRow = {
            Identity: trimmedRow["Identity"],
            OMURL: trimmedRow["OMURL"],
            SP: price,
            MSC: parseInt(trimmedRow["MSC"]) || 0,
            NMURL: modifyNMURL(trimmedRow["OMURL"], price),
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
async function scrapeNMURL(nmurl: string): Promise<any[]> {
  const itemsArray: any[] = [];
  const processedItemIds = new Set();

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [`--proxy-server=${PROXY_URL}`],
    });

    const page = await browser.newPage();

    page.on("response", async (response) => {
      const requestUrl = response.url();
      if (requestUrl.includes("https://api.mercari.jp/v2/entities:search")) {
        try {
          const jsonResponse = await response.json();
          const items = jsonResponse.items.filter((item: any) => item.status === "ITEM_STATUS_SOLD_OUT");

          // Filter out duplicates
          items.forEach((item: any) => {
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

// Save updated data back to the CSV file
function saveCSVFile(filePath: string, data: any[]): void {
  const headers = ["Identity", "OMURL", "S.P.", "NMURL", "MSC"];
  const csvContent = [
    headers.join(","),
    ...data.map((item) =>
      [item.Identity, item.OMURL, `"${item.SP}"`, item.NMURL, item.MSC].join(",")
    ),
  ].join("\n");

  try {
    fs.writeFileSync(filePath, csvContent, "utf8");
    console.log("CSV file updated successfully.");
  } catch (error) {
    console.error("Error writing CSV file:", error);
  }
}

// initiate the scraping process
async function startScrapingProcess() {
  try {
    const csvData = await readCSVFile(FILE_PATH);


    for (const item of csvData) {
      // formatting NMURL
      if (!item.NMURL.includes("price_max") || !item.NMURL.includes("status")) {
        item.NMURL = modifyNMURL(item.OMURL, item.SP);
      }

      const items = await scrapeNMURL(item.NMURL);

      if (items.length > 0) {
        // Checking if "updated" time is before 30 days
        for (const itm of items) {
          const itemUpdatedDate = new Date(itm.updated);
          const comparisonDate = new Date(date30daysBefore);

          if (itemUpdatedDate >= comparisonDate && itemUpdatedDate <= new Date()) {
            // Increasing MSC of the item
            const index = csvData.findIndex((csvItem) => csvItem.Identity === item.Identity);
            if (index > -1) {
              csvData[index].MSC += 1;
            }
          }
        }
      }
      console.log(`Processed NMURL for ${item.Identity}`);
    }
    saveCSVFile(FILE_PATH, csvData);
  } catch (error) {
    console.error("Error during the scraping process:", error);
  }
}


startScrapingProcess();


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
