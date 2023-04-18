import * as dotenv from "dotenv";
import puppeteer, { Page } from "puppeteer";
import {
	initialSetup,
	handleLogging,
	screenshot,
	login,
	logout,
	clickText,
	selectPerson,
} from "./functions.js";

import data from "../data/recipients.json" assert { type: "json" };

dotenv.config();

const handleElectronicSignature = async (page: Page) => {
	// Check agree to terms
	const checkbox = await page.waitForSelector("#checkbox-input");
	checkbox?.click();

	// Click to electronically sign
	const signButton = await page.waitForSelector(
		"text/Electronically Sign Timesheet & Submit for Payment"
	);
	signButton?.click();

	// Handle confirmation
	await page.waitForSelector(
		"text/This timesheet has been submitted for processing."
	);
	const okButton = await page.waitForSelector("text/OK");
	okButton?.click();
};

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
		await selectPerson(page, process.env.NAME as string);
		await clickText(page, "Approve Timesheet", "Electronic Signature");
		await handleElectronicSignature(page);
		await logout(page);
	}

	await browser.close();
})();
