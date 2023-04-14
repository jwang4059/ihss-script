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

import data from "../data/recipients.json" assert { type: "json" };

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

	for (const { username, password } of Object.values(data.recipients)) {
		await login(page, username as string, password as string);
		await clickText(page, "TIMESHEET REVIEW", "Provider Selection");
		await logout(page);
	}

	await browser.close();
})();
