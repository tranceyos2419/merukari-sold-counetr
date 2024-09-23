### Fix

### Modification

- Could you use the proxy to scrape?
- Could you console.log the IP Address & UserAgent that the system is using to scrape?

### Question

### Future work

- Convert if sentences into shorthand

- Organize functions into separated files

### Memo

- Do we need item.status === "ITEM_STATUS_SOLD_OUT" ?
  => yes beacuse as we go to nmurl then there are also call multiple request like similar items etc. therefore i use this to get only that which we want.

- What’s await page.goto(nmurl, { waitUntil: "networkidle2" }); doing?
  => It ensures that the page is fully loaded before proceeding with scraping, which is essential for dynamic content

- Do we need if (!item.NMURL.includes("price_max") || !item.NMURL.includes("status”))?
  => This check ensures that the NMURL is correctly formatted with the necessary parameters

- Do we need && itemUpdatedDate <= new Date() ?
  => This check ensures that the item's updated date is not in the future, which helps maintain data integrity

- Is this using the proxy correctly? Because I don't see any successful requests on scrape.do dashboard
  => not working properly due to our nmurl beacuse when we use proxy on nmurl then this make it invalid link.

- Did you test this app with a large dataset like more than 300 data?
  => yes i have also test with 500
