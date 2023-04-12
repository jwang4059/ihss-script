import * as dotenv from "dotenv";
import puppeteer from "puppeteer";
import {
	initialSetup,
	handleLogging,
	screenshot,
	login,
	logout,
	navigateToRecipientSelection,
} from "./functions.js";
import fillTimesheet from "./timesheet.js";

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

	await login(page);

	await navigateToRecipientSelection(page);

	const names = [
		process.env.NAME1 as string,
		process.env.NAME2 as string,
		process.env.NAME3 as string,
	];

	for (const name of names) await fillTimesheet(page, name);

	await logout(page);

	await browser.close();
})();
