import * as dotenv from "dotenv";
import puppeteer from "puppeteer";
import {
	beforeAll,
	handleLogging,
	screenshot,
	login,
	logout,
	fillWorkweek,
} from "./functions.js";

dotenv.config();

const DEBUG = true;

(async () => {
	beforeAll();

	const puppeteerLaunchOptions = DEBUG
		? { headless: false, slowMo: 100 }
		: undefined;

	const browser = await puppeteer.launch(puppeteerLaunchOptions);
	const page = await browser.newPage();
	handleLogging(page);

	await page.goto("https://etimesheets.ihss.ca.gov/login");

	// Set screen size
	await page.setViewport({ width: 1080, height: 1024 });
	await screenshot(page, "display_ihss_login_page");

	await login(page);

	// Select Time Entry
	await screenshot(page, "display_provider_home_page");
	await page.waitForSelector("#timecardEntry");
	await page.click("#timecardEntry");

	// Get Recipients
	await screenshot(page, "display_recipient_selection_page");
	await page.waitForSelector("[id^='recip-card']");
	const recipientButtonId = await page.evaluate((name: string) => {
		const recipientCards = Array.from(
			document.querySelectorAll("[id^='recip-card']")
		);
		const recipientCard = recipientCards.find(
			(el) =>
				el
					?.querySelector<HTMLElement>("[id^='recipient-name']")
					?.innerText.trim()
					.toLowerCase() === name
		);
		return recipientCard?.querySelector("button")?.id;
	}, process.env.NAME as string);
	await page.click(`#${recipientButtonId}`);

	// Verify Recipient
	await page.waitForFunction(
		(name: string) =>
			document
				.querySelector<HTMLElement>("#recipient-name")
				?.innerText.trim()
				.toLowerCase() === name,
		{},
		process.env.name as string
	);

	await screenshot(
		page,
		`display_${(process.env.NAME as string).split(" ").join("_")}_page`
	);

	// Select Pay Period
	await page.waitForSelector("#payPerdiodSelect");
	await page.click("#payPerdiodSelect");
	await page.waitForSelector("#payPerdiodSelect-panel");
	const payPeriodId = await page.evaluate(() => {
		const options = Array.from(
			document?.querySelectorAll("#payPerdiodSelect-panel mat-option")
		);
		const target = options.find(
			(el) =>
				new Date(
					(el as HTMLElement).innerText.split("-")[0].trim()
				).getDate() === 16
		);
		return target?.id;
	});
	await page.click(`#${payPeriodId}`);
	await screenshot(page, "select_pay_period");

	// Open workweeks
	await page.waitForSelector("mat-expansion-panel");
	const workweekIds = await page.evaluate(() => {
		const workweeks = Array.from(
			document.querySelectorAll("mat-expansion-panel-header")
		);
		return workweeks.map((el) => el.id);
	});

	await fillWorkweek(page, workweekIds[0]);

	// Logout
	await logout(page);

	await browser.close();
})();
