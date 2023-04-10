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

const beforeAll = () => {
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
	await page.waitForSelector("#login");
	await page.click("#login");
};

const logout = async (page: Page) => {
	await page.waitForSelector('[aria-label="Logout"]');
	await page.click('[aria-label="Logout"]');
	await screenshot(page, "logout");
	console.log("Logged out successfully.");
};

const enterInput = async (page: Page, selector?: string, text?: string) => {
	if (!selector || !text) return;

	await page.waitForSelector(selector);
	await page.click(selector, { clickCount: 3 });
	await page.keyboard.type(text);
};

const selectLocation = async (
	page: Page,
	locationId?: string,
	location?: string
) => {
	// Click select and wait for options
	await page.click(`#${locationId}`);
	await page.waitForSelector(`#${locationId}-panel`);

	// Get id for option
	const optionId = await page.evaluate(
		(selector: string, target: string) => {
			const options = Array.from(
				document.querySelectorAll<HTMLElement>(selector)
			);
			return options.find((el) => el.innerText.trim().toLowerCase() === target)
				?.id;
		},
		`#${locationId}-panel mat-option`,
		location || "home"
	);

	// Select option
	await page.click(`#${optionId}`);
};

const getTimeEntryIds = async (page: Page, workweekId: string) => {
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
	}, workweekId);

	return timeEntryIds;
};

const getTimeEntryInputIds = async (page: Page, timeEntryId: string) => {
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
	}, timeEntryId);

	return inputIds;
};

type InputType = { id?: string; text?: string };

const fillTimeEntryInputs = async (
	page: Page,
	{
		hours,
		minutes,
		start,
		end,
		location,
	}: {
		hours: InputType;
		minutes: InputType;
		start: InputType;
		end: InputType;
		location: InputType;
	}
) => {
	await enterInput(page, `#${hours.id}`, hours.text);
	await enterInput(page, `#${minutes.id}`, minutes.text);
	await enterInput(page, `#${start.id}`, start.text);
	await enterInput(page, `#${end.id}`, end.text);
	await selectLocation(page, location.id, location.text);
};

const fillTimeEntry = async (page: Page, timeEntryId: string) => {
	// Scroll to time entry
	await scrollIntoView(page, `#${timeEntryId}`);

	// Get input ids
	const inputIds = await getTimeEntryInputIds(page, timeEntryId);

	// Fill out form for time entry
	await fillTimeEntryInputs(page, {
		hours: { id: inputIds.hoursId, text: "2" },
		minutes: { id: inputIds.minutesId, text: "00" },
		start: { id: inputIds.startId, text: "09:00AM" },
		end: { id: inputIds.endId, text: "11:00AM" },
		location: { id: inputIds.locationId, text: "home" },
	});

	await screenshot(page, `filled_timeEntry_${timeEntryId}`);
};

const fillWorkweek = async (page: Page, workweekId: string) => {
	// Toggle workweek panel
	await page.click(`#${workweekId}`);
	await screenshot(page, `toggle_workweek_${workweekId}`);

	// Fill time entries
	const timeEntryIds = await getTimeEntryIds(page, workweekId);
	for (const timeEntryId of timeEntryIds) {
		await fillTimeEntry(page, timeEntryId);
	}

	await screenshot(page, `filled_workweek_${workweekId}`);
};

export {
	beforeAll,
	handleLogging,
	screenshot,
	scrollIntoView,
	login,
	logout,
	fillWorkweek,
};
