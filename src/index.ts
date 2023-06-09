import * as dotenv from "dotenv";
import puppeteer from "puppeteer";
import {
	initialSetup,
	handleLogging,
	screenshot,
	login,
	logout,
	clickText,
} from "./functions.js";
import fillTimesheets from "./timesheet.js";

dotenv.config();

(async () => {
	initialSetup();

	const puppeteerLaunchOptions = { headless: false, slowMo: 100 };

	const browser = await puppeteer.launch(puppeteerLaunchOptions);
	const page = await browser.newPage();
	handleLogging(page);

	await page.goto("https://etimesheets.ihss.ca.gov/login");
	await page.setViewport({ width: 1080, height: 1024 });

	await page.waitForSelector("text/Login to Your Account");
	await screenshot(page, "display_ihss_login_page");

	await login(
		page,
		process.env.IHSS_USERNAME as string,
		process.env.IHSS_PASSWORD as string
	);

	await clickText(page, "TIMESHEET ENTRY", "Recipient Selection");

	await fillTimesheets(page);

	await logout(page);

	await browser.close();
})();
