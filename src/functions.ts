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

const handlePasswordExpiration = async (page: Page, username: string) => {
	try {
		await page.waitForSelector("text/Password Expiration", { timeout: 5000 });
	} catch (e) {
		// Return if pop up not found
		return;
	}

	await screenshot(page, `password_expiration_${username}`);
	console.log(`*** Need to update password for ${username} ***`);

	// Click no button
	const laterButton = await page.waitForSelector("text/Maybe Later");
	await laterButton?.click();
};

const login = async (page: Page, username: string, password: string) => {
	// Enter user credentials
	await page.waitForSelector("#login-body");
	await scrollIntoView(page, "#input-user-name");
	await page.type("#input-user-name", username);
	await page.type("#input-password", password);
	await screenshot(page, "input_user_credentials");

	// Login
	const loginButton = await page.waitForSelector("#login");
	await loginButton?.click();

	await handlePasswordExpiration(page, username);

	// Verify login to home page
	await page.waitForSelector("text/Home");
	await screenshot(page, `display_home_page`);
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

const clickText = async (page: Page, text: string, expected?: string) => {
	// Navigate to selection page
	const pressable = await page.waitForSelector(`text/${text}`);
	await pressable?.click();

	// Wait for page to load
	if (expected) {
		await page.waitForSelector(`text/${expected}`);
		await screenshot(page, `display_${expected}`);
	}
};

const selectPerson = async (page: Page, name: string) => {
	// Get card id
	await page.waitForSelector("mat-card");
	const button = await page.evaluate((cardName: string) => {
		// Get cards
		const cards = Array.from(document.querySelectorAll("mat-card"));

		// Get card with card name
		const card = cards.find(
			(el) =>
				el
					?.querySelector<HTMLElement>("mat-card-header")
					?.innerText.trim()
					.toLowerCase() === cardName.trim().toLowerCase()
		);
		return card?.querySelector("button")?.id;
	}, name);

	// Click cared button
	await page.click(`#${button}`);

	// Verify person
	await page.waitForSelector(`text/${name.toUpperCase()}`);
	await screenshot(page, `display_${name.split(" ").join("_")}_page`);
};

export {
	initialSetup,
	handleLogging,
	screenshot,
	scrollIntoView,
	login,
	logout,
	clickText,
	selectPerson,
};
