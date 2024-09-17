### Fix

### Modification

- Could you not use any for the inputs and the outputs of functions (Ex: const itemsArray: any[] = []; , saveCSVFile(filePath: string, data: any[]): void {) -> Please define a custom interface

- Could you just use "papaparse" to prase for reading and saving CSV files?

- Could you make scrapeNMURL() returns the custom interface that you defined?

### Questions

- Don’t we have simpler way to implement trimmedRow["Identity"]
- Do we need item.status === "ITEM_STATUS_SOLD_OUT" ?
- What’s await page.goto(nmurl, { waitUntil: "networkidle2" }); doing?
- Why do we need express.js for this?
- Do we need if (!item.NMURL.includes("price_max") || !item.NMURL.includes("status”))?
- Do we need && itemUpdatedDate <= new Date() ?

### Future work

- Convert if sentences into shorthand

- Organize functions into separated files
