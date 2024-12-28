//# Read CSV file
// async function readCSVFile(filePath: string): Promise<CSVInput[]> {
//   return new Promise((resolve, reject) => {
//     const results: CSVInput[] = [];
//     let rowNumber = 0;

//     if (!fs.existsSync(filePath)) {
//       return reject(new Error(`File not found: ${filePath}`));
//     }

//     const fileStream = fs.createReadStream(filePath);

//     // Use csv-parser as a cursor to process each row
//     const csvStream = fileStream.pipe(csv({ separator: "," }));

//     csvStream
//       .on("data", (row) => {
//         rowNumber++;

//         try {
//           const keyword = row["Keyword"]?.trim();
//           const identity = row["Identity"]?.trim();
//           const omurl = row["OMURL"]?.trim();
//           const sp = row["SP"]?.trim();
//           const msc = row["MSC"]?.trim() || "0";

//           // Check if essential fields exist
//           if (!keyword || !identity || !omurl || !sp) {
//             console.log(
//               `Row ${rowNumber} skipped due to missing fields: ${JSON.stringify(
//                 row
//               )}
//             `);
//             return;
//           }

//           // Convert price (S.P.) and MSC to numbers
//           const price = parseFloat(sp.replace(/[^\d.-]/g, ""));
//           const mscNumber = parseFloat(msc);

//           if (isNaN(price)) {
//             console.log(`Row ${rowNumber} skipped due to invalid price: ${sp}`);
//             return;
//           }

//           const processedRow: CSVInput = {
//             Keyword: keyword,
//             Identity: identity,
//             OMURL: omurl,
//             SP: price,
//             MSC: isNaN(mscNumber) ? 0 : mscNumber,
//             NMURL: modifyNMURL(omurl, price),
//           };

//           results.push(processedRow);
//         } catch (error) {
//           console.error(`Error processing row ${rowNumber}: ${error.message}`);
//         }
//       })
//       .on("end", () => resolve(results))
//       .on("error", (err) => reject(err));
//   });
// }

//# DecodeExcludeKeyword
// function decodeExcludeKeyword(urlString: string): string | null {
//   try {
//     const parsedUrl = new URL(urlString);
//     const excludeKeyword = parsedUrl.searchParams.get('exclude_keyword');

//     const decodedKeyword = excludeKeyword ? decodeURIComponent(excludeKeyword) : null;
//     if (decodedKeyword) {
//       const components = decodedKeyword.split(" ").filter(part => part !== "");
//       return components.join("|");
//     }

//     return null;
//   } catch (error) {
//     console.error('Invalid URL:', error);
//     return null;
//   }
// }

//# Function to get min price from the URL
// function getMinPriceFromURL(url: string) {
//   const params = new URL(url).searchParams;
//   return params.get("price_min");
// }

//# Function to get max price from the URL
// function getMaxPriceFromURL(url: string) {
//   const params = new URL(url).searchParams;
//   return params.get("price_max");
// }

//# Function to separate by commas
// function separateByCommas(url: string): string | null {
//   try {
//     const parsedUrl = new URL(url);
//     const keyword = parsedUrl.searchParams.get('keyword');

//     if (keyword) {
//       const components = keyword.split(" ").filter(part => part !== "");
//       return components.join(",");
//     } else {
//       return null;
//     }
//   } catch (error) {
//     console.error('Invalid URL:', error);
//     return null;
//   }
// }

//# Save updated data back to a new CSV file (output.csv)
// function saveCSVFile(filePath: string, data: CSVInput[]): void {
//   const headers = [
//     "Keyword", "Identity", "OMURL", "SP", "NMURL", "MSC", "name", "switchAll",
//     "kws", "kwes", "pmin", "pmax", "sve", "nickname", "nicknameExs",
//     "itemStatuses", "freeShipping", "kwsTitle", "kwesTitle", "autoBuy",
//     "gotoBuy", "type", "target", "category", "size", "brand", "sellerId",
//     "sellerIdExs", "notificationCnt", "receiveCnt", "openCnt", "buyCnt",
//     "buyPrice", "autoBuyTryCnt", "autoBuySuccessCnt", "autoMoveTryCnt",
//     "autoMoveSuccessCnt", "tags", "memo"
//   ];
//   const csvContent = [
//     headers.join(","),
//     ...data.map((item) =>
//       [
//         item.Keyword, item.Identity, item.OMURL, item.SP, item.NMURL, item.MSC,
//         `${item.Identity} | ${item.Keyword} | SP: ${item.SP} | MSC: ${item.MSC}`, true,
//         `"${separateByCommas(item.NMURL)}"`, `"${decodeExcludeKeyword(item.NMURL)}"`, getMinPriceFromURL(item.NMURL), getMaxPriceFromURL(item.NMURL),
//         " ",
//         "", " ", '"2,3,4,5"', " ",
//         `"${separateByCommas(item.NMURL)}"`, `"${decodeExcludeKeyword(item.NMURL)}"`, false, false, "normal",
//         " ", " ", " ", " ",
//         " ", " ", 0, 0,
//         0, " ", " ", 0,
//         0, 0, 0,
//         item.Identity, item.NMURL,
//       ].join(
//         ","
//       )
//     ),
//   ].join("\n");

//   try {
//     fs.writeFileSync(filePath, csvContent, "utf8");
//     console.log(`CSV file saved successfully as ${filePath}.`);
//   } catch (error) {
//     console.error("Error writing CSV file:", error);
//   }
// }


//# Scrape data
// async function scrapeNMURL(nmurl: string): Promise<ScrapedItem[]> {
//   const itemsArray: ScrapedItem[] = [];
//   const processedItemIds = new Set<string>();
//   try {
//     let args = [
//       '--disable-blink-features=AutomationControlled',
//       "--disable-webgl",
//       "--disable-webrtc",
//       "--disable-dev-shm-usage",
//       "--no-sandbox",
//       "--disable-setuid-sandbox",
//       "--window-size=375,667"
//     ]

//     const browser = await puppeteer.launch({
//       headless: true,
//       defaultViewport: null,
//       args
//     })

//     const page = await browser.newPage();

//     // const [res] = await Promise.all([
//     //   page.waitForResponse(res => res.url() === "https://api.mercari.jp/v2/entities:search", {timeout: 90_000}),
//     //   page.goto(nmurl, {waitUntil: "domcontentloaded"}),
//     // ]);
//     // console.log("response::",await res.json());

//     page.on("response", async (response) => {
//       const requestUrl = response.url();

//       if (requestUrl.includes("https://api.mercari.jp/v2/entities:search")) {
//         try {
//           const jsonResponse = await response.json();
//           console.log(JSON.stringify(jsonResponse));
//           const items: ScrapedItem[] = jsonResponse.items.filter(
//             (item: ScrapedItem) => item.status === "ITEM_STATUS_SOLD_OUT"
//           );

//           // Filter out duplicates
//           items.forEach((item: ScrapedItem) => {
//             if (!processedItemIds.has(item.id)) {
//               processedItemIds.add(item.id);
//               itemsArray.push({
//                 ...item,
//                 updated: convertTimestampToDate(item.updated),
//               });
//             }
//           });



//         } catch (error) {
//           console.warn("Issue parsing JSON response " + error);
//         }
//       }
//     });

//     await page.goto(nmurl, { waitUntil: "networkidle2", timeout: 300000 });
//     await browser.close();

//     return itemsArray;
//   } catch (error) {
//     console.error(`Error scraping ${nmurl}:, error : ${error}`);
//     return [];
//   }
// }



//@ handling internet issue kinda thing retry mechanism
// export async function executeWithRetry<T>(
// 	operation: () => Promise<T>,
// 	errorHandler: (error: any) => void
// ): Promise<T | null> {
// 	const MAX_RETRIES = 3;
// 	const retryCount = MAX_RETRIES;

// 	const delay = (ms: number) =>
// 		new Promise((resolve) => setTimeout(resolve, ms));

// 	for (let attempt = 1; attempt <= retryCount; attempt++) {
// 		try {
// 			return await operation();
// 		} catch (error) {
// 			errorHandler(error);
// 			if (attempt < retryCount) {
// 				console.log(
// 					`Retrying ${attempt} of ${retryCount}... Waiting 1 minute.`
// 				);
// 				await delay(60000); // wait for 60 seconds to retrying
// 			} else {
// 				console.error("Max retries reached. Operation failed.");
// 			}
// 		}
// 	}
// 	return null;
// }


//# main logic
// MSC
// Increasing MSC of the item
// const index = csvData.findIndex((csvItem) => csvItem.Identity === item.Identity);
// if (index > -1) {
// csvData[index].MSC += 1;
// }
