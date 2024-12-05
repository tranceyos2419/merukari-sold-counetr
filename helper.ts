import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { ProxyInput, CSVInput, CSVOutput } from "./interfaces";

// Read a CSV file
export const readDataSet = (filePath: string): CSVInput[] | CSVOutput[] => {
	let parsedData: CSVInput[] | CSVOutput[] = [];
	try {
		const csvData = fs.readFileSync(filePath, "utf-8");
		parsedData = Papa.parse(csvData, {
			header: true,
			skipEmptyLines: true,
		}).data;
	} catch (err) {
		console.error(`Error reading input file: ${filePath}`, err);
	}
	console.log(`Read data from: ${filePath}`);
	return parsedData;
};

// Read JSON file for proxies
export const readProxiesJson = (filePath: string): ProxyInput[] => {
	const result = new Promise((resolve, reject) => {
		fs.readFile(filePath, "utf8", (err, data) => {
			if (err) {
				reject(`Error reading the proxies file: ${filePath} ${err}`);
				return;
			}

			try {
				const proxies = JSON.parse(data);
				resolve(proxies);
			} catch (parseError) {
				reject(
					`Error parsing JSON from proxies file: ${filePath} ${parseError}`
				);
			}
		});
	}) as unknown as ProxyInput[];
	return result;
};

// Save CSV file
export const saveData = (filePath: string, data: CSVOutput[]) => {
	try {
		const finalData = Papa.unparse(data);
		fs.writeFileSync(filePath, finalData);
		console.log(`Saved data to: ${filePath}`);
	} catch (err) {
		console.error(`Error saving data to: ${filePath}`, err);
	}
};

// Utility functions
export const getDate30DaysAgo = (): string => {
	const today = new Date();
	today.setDate(today.getDate() - 30);
	return today.toISOString().split("T")[0];
};

export const convertTimestampToDate = (timestamp: string): string => {
	const date = new Date(parseInt(timestamp, 10) * 1000);
	return date.toISOString();
};

export const createNMURL = (omurl: string, sp: number): string => {
	const price_max = sp.toString().slice(1).replace(/,/g, "");
	const url = new URL(omurl);
	url.searchParams.set("price_max", price_max);
	url.searchParams.set("status", "sold_out");
	url.searchParams.set("order", "desc");
	url.searchParams.set("sort", "created_time");
	return url.toString();
};

export const selectRandomProxy = (arr: ProxyInput[]): ProxyInput => {
	return arr[Math.floor(Math.random() * arr.length)];
};

export const calculateMedian = (numbers: number[]): number => {
	const sorted = numbers.slice().sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle];
};

export const millisToMinutesAndSeconds = (millis: number): string => {
	const minutes = Math.floor(millis / 60000);
	const seconds = ((millis % 60000) / 1000).toFixed(0);
	return `${minutes}:${seconds.padStart(2, "0")}`;
};
