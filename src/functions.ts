import fs from "fs";
import { Page } from "puppeteer";

const dir = `./logs/${new Date().toISOString().slice(0, 10)}`;

const getTime = () => new Date().getTime();

const screenshot = async (page: Page, filename: string) => {
	await page.screenshot({
		path: `${dir}/${getTime()}_${filename}.png`,
	});
};

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

const scrollIntoView = async (page: Page, selector: string) => {
	const element = await page.waitForSelector(selector);
	await element?.evaluate((el) => el.scrollIntoView());
};

const initialSetup = () => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const login = async (page: Page) => {
	// Enter user credentials
	await page.waitForSelector("#login-body");
	await scrollIntoView(page, "#input-user-name");
	await page.type("#input-user-name", process.env.IHSS_USERNAME as string);
	await page.type("#input-password", process.env.IHSS_PASSWORD as string);
	await screenshot(page, "input_user_credentials");

	// Login
	const loginButton = await page.waitForSelector("#login");
	await loginButton?.click();

	// Verify login to home page
	await page.waitForSelector("text/Home");
	await screenshot(page, "display_provider_home_page");
};

const logout = async (page: Page) => {
	try {
		// Logout
		const logoutButton = await page.waitForSelector("aria/Logout");
		await logoutButton?.click();

		// Verify logout
		await page.waitForSelector("text/Login to Your Account");
		await screenshot(page, "logout");

		// Log to terminal
		console.log("Successfully logged out.");
	} catch (e) {
		console.log("Failed to log out.", e);
	}
};

const navigateToRecipientSelection = async (page: Page) => {
	// Navigate to recipient selection
	await page.waitForSelector("#timecardEntry");
	await page.click("#timecardEntry");

	// Wait for page to load
	await page.waitForSelector("text/Recipient Selection");
	await screenshot(page, "display_recipient_selection_page");
};

export {
	initialSetup,
	handleLogging,
	screenshot,
	scrollIntoView,
	login,
	logout,
	navigateToRecipientSelection,
};
