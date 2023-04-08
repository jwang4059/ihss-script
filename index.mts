import * as dotenv from "dotenv";
import fs from "fs";
import puppeteer, { Page } from "puppeteer";

dotenv.config();

const DEBUG = true;

const dir = `./logs/${new Date().toISOString().slice(0, 10)}`;

const beforeAll = () => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const getTime = () => new Date().getTime();

const handleLogging = (page: Page) => {
	page.on("console", (message) =>
		fs.appendFile(
			`${dir}/console.txt`,
			`${getTime()} ${message
				.type()
				.substring(0, 3)
				.toUpperCase()} ${message.text()}\n`,
			(err) => {
				if (err) {
					console.log(err);
				}
			}
		)
	);
};

const screenshot = async (page: Page, filename: string) => {
	await page.screenshot({
		path: `${dir}/${getTime()}_${filename}.png`,
	});
};

const scrollIntoView = async (page: Page, selector: string) => {
	const element = await page.waitForSelector(selector);
	await element?.evaluate((el) => el.scrollIntoView());
};

(async () => {
	beforeAll();

	const puppeteerLaunchOptions = DEBUG
		? { headless: false, slowMo: 250 }
		: undefined;

	const browser = await puppeteer.launch(puppeteerLaunchOptions);
	const page = await browser.newPage();
	handleLogging(page);

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

	// Select Time Entry
	await page.waitForSelector("#timeentry");
	await page.click("#timecardEntry");
	await screenshot(page, "select_time_entry");

	// Get Recipients
	await page.waitForSelector("[id^='recip-card']");
	await page.evaluate((name: string) => {
		const recipientCards = Array.from(
			document.querySelectorAll("[id^='recip-card']")
		);
		const recipientCard = recipientCards.find(
			(el) =>
				el
					?.querySelector<HTMLElement>("[id^='recipient-name']")
					?.innerText.trim()
					.toLocaleLowerCase() === name
		);
		recipientCard?.querySelector("button")?.click();
	}, (process.env.NAME as string).trim().toLowerCase());

	await screenshot(
		page,
		`select_${(process.env.NAME as string).split(" ").join("_")}`
	);

	// Logout
	await page.waitForSelector('[aria-label="Logout"]');
	await page.click('[aria-label="Logout"]');
	await screenshot(page, "logout");
	console.log("Logged out successfully.");

	await browser.close();
})();
