import * as dotenv from "dotenv";
import puppeteer from "puppeteer";
import {
	beforeAll,
	handleLogging,
	screenshot,
	scrollIntoView,
	login,
	logout,
	fillTimeEntry,
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
				).getDate() === 1
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

	await page.click(`#${workweekIds[0]}`);
	await screenshot(page, `toggle_workweek_${0 + 1}`);

	// Get time entries
	const timeEntryIds = await page.evaluate((id: string) => {
		const workweek = Array.from(
			document.querySelectorAll("mat-expansion-panel")
		).find((el) => el.querySelector(`[id='${id}']`));
		const timeEntries = workweek
			? Array.from(workweek.querySelectorAll("[id^='evv-time-entry']")).filter(
					(el) => el.querySelector("input")
			  )
			: [];
		return timeEntries.map((el) => el.id);
	}, workweekIds[0]);

	await scrollIntoView(page, `#${timeEntryIds[0]}`);

	// Get input ids
	const inputIds = await page.evaluate((id: string) => {
		const timeEntry = document.querySelector(`#${id}`);
		// const timeEntryDate = timeEntry
		// 	?.querySelector<HTMLElement>("[id^='workweekdays']")
		// 	?.innerText.split(/\s+/)[1];

		// Check if you worked that day first before grabbing ids

		const hoursId = timeEntry?.querySelector("input[id^='hours']")?.id;
		const minutesId = timeEntry?.querySelector("input[id^='minutes']")?.id;
		const startId = timeEntry?.querySelector("input[id^='starttime']")?.id;
		const endId = timeEntry?.querySelector("input[id^='endtime']")?.id;
		const locationId = timeEntry?.querySelector(
			"mat-select[id^='locationSelect']"
		)?.id;

		return { hoursId, minutesId, startId, endId, locationId };
	}, timeEntryIds[0]);

	console.log(inputIds);

	// Fill out form for time entry
	await fillTimeEntry(page, {
		hours: { id: inputIds.hoursId, text: "2" },
		minutes: { id: inputIds.minutesId, text: "00" },
		start: { id: inputIds.startId, text: "09:00AM" },
		end: { id: inputIds.endId, text: "11:00AM" },
		location: { id: inputIds.locationId, text: "home" },
	});

	// Logout
	await logout(page);

	await browser.close();
})();
