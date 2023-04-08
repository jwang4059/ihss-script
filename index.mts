import * as dotenv from "dotenv";
import puppeteer, { Page } from "puppeteer";

dotenv.config();

const DEBUG = true;

const screenshot = async (page: Page, filename: string) => {
	await page.screenshot({ path: `./logs/screenshots/${filename}.png` });
};

const scrollIntoView = async (page: Page, selector: string) => {
	const element = await page.waitForSelector(selector);
	await element?.evaluate((el) => el.scrollIntoView());
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

	// Input user credentials
	await scrollIntoView(page, "#input-user-name");
	await page.type("#input-user-name", process.env.IHSS_USERNAME as string);
	await page.type("#input-password", process.env.IHSS_PASSWORD as string);
	await screenshot(page, "input_user_credentials");

	// Login
	await page.waitForSelector("#login");
	await page.click("#login");
	await screenshot(page, "login");

	// Logout
	await page.waitForSelector('[aria-label="Logout"]');
	await page.click('[aria-label="Logout"]');
	await screenshot(page, "logout");
	console.log("Logged out successfully.");

	await browser.close();
})();
