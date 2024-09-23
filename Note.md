### Fix

### Modification

- Could you not use any for the inputs and the outputs of functions (Ex: const itemsArray: any[] = []; , saveCSVFile(filePath: string, data: any[]): void {) -> Please define a custom interface
  => yes i have added this.
- Could you just use "papaparse" to prase for reading and saving CSV files?
  => i try this but have issue in reading file.
- Could you make scrapeNMURL() returns the custom interface that you defined?
  => yes done.
- Could you read input.csv and create output.csv as the result?
  => yes done.
- Could you not remove the rows that contain incorrect data from the output?
  => yes
- Could you output the same order of the items as it's input?
  => yes
- ## Could you output the same order of the items as it's input?

### Questions

- Don’t we have simpler way to implement trimmedRow["Identity"]
  => yes i have changed into simple way.
- Do we need item.status === "ITEM_STATUS_SOLD_OUT" ?
  => yes beacuse as we go to nmurl then there are also call multiple request like similar items etc. therefore i use this to get only that which we want.
- What’s await page.goto(nmurl, { waitUntil: "networkidle2" }); doing?
  => It ensures that the page is fully loaded before proceeding with scraping, which is essential for dynamic content
- Why do we need express.js for this?
  => i have removed express.
- Do we need if (!item.NMURL.includes("price_max") || !item.NMURL.includes("status”))?
  => This check ensures that the NMURL is correctly formatted with the necessary parameters
- Do we need && itemUpdatedDate <= new Date() ?
  => This check ensures that the item's updated date is not in the future, which helps maintain data integrity
- Is this using the proxy correctly? Because I don't see any successful requests on scrape.do dashboard
  => not working properly due to our nmurl beacuse when we use proxy on nmurl then this make it invalid link.
- Did you test this app with a large dataset like more than 300 data?
  => yes i have also test with 500

### Future work

- Convert if sentences into shorthand

- Organize functions into separated files
