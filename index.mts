import * as dotenv from "dotenv";
import puppeteer, { Page } from "puppeteer";

dotenv.config();

const DEBUG = true;

const screenshot = async (page: Page, filename: string) => {
	await page.screenshot({ path: `./logs/screenshots/${filename}.png` });
};

const scrollIntoView = async (page: Page, selector: string) => {
	await page.evaluate((s) => {
		document.querySelector(s)?.scrollIntoView();
	}, selector);
};

(async () => {
	const puppeteerLaunchOptions = DEBUG
		? { headless: false, slowMo: 250 }
		: undefined;

	const browser = await puppeteer.launch(puppeteerLaunchOptions);
	const page = await browser.newPage();

	await page.goto("https://etimesheets.ihss.ca.gov/login");

	// Set screen size
	await page.setViewport({ width: 1080, height: 1024 });
	await screenshot(page, "load_initial_page");

	// Enter user credentials
	await scrollIntoView(page, "#input-user-name");
	await page.type("#input-user-name", process.env.IHSS_USERNAME as string);
	await page.type("#input-password", process.env.IHSS_PASSWORD as string);
	await screenshot(page, "input_user_credentials");

	// // Wait and click on first result
	// const searchResultSelector = ".search-box__link";
	// await page.waitForSelector(searchResultSelector);
	// await page.click(searchResultSelector);

	// // Locate the full title with a unique string
	// const textSelector = await page.waitForSelector(
	// 	"text/Customize and automate"
	// );
	// const fullTitle = await textSelector?.evaluate((el) => el.textContent);

	// // Print the full title
	// console.log('The title of this blog post is "%s".', fullTitle);

	await browser.close();
})();
