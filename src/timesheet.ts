import { Page } from "puppeteer";
import { scrollIntoView, screenshot, selectPerson } from "./functions.js";
import data from "../data/recipients.json" assert { type: "json" };

type InputType = { id?: string; text?: string };

type TimeEntryType = {
	hours?: string;
	minutes?: string;
	start?: string;
	end?: string;
	location?: string;
	days?: number[];
};

type TimeEntryMapType = {
	[key: string]: TimeEntryType;
};

const RecipientsExceptionMap: { [key: string]: TimeEntryMapType } = {};

const getExceptionMap = (name: string) => {
	const { exceptions }: { exceptions: TimeEntryType[] } =
		data.recipients[name as keyof typeof data.recipients];

	const map: TimeEntryMapType = {};

	for (const exception of exceptions) {
		const { days, ...rest } = exception;
		if (days) {
			for (const day of days) {
				map[day] = { ...rest };
			}
		}
	}

	return map;
};

const handlePopup = async (page: Page) => {
	try {
		await page.waitForSelector("mat-dialog-container", { timeout: 5000 });
	} catch (e) {
		// Return if pop up not found
		return;
	}

	await screenshot(page, "found_pop_up");

	// Click no button
	const noButton = await page.waitForSelector("text/No");
	await noButton?.click();

	// Verify pop up is gone
	await page.waitForSelector("mat-dialog-container", { hidden: true });
	await screenshot(page, "handled_pop_up");
};

const selectPayPeriod = async (page: Page) => {
	// Toggle pay period panel
	const select = await page.waitForSelector("#payPerdiodSelect");
	await select?.click();

	// Get pay period option id
	await page.waitForSelector("#payPerdiodSelect-panel");
	const optionId = await page.evaluate((startDate: number) => {
		const options = Array.from(
			document?.querySelectorAll("#payPerdiodSelect-panel mat-option")
		);
		const target = options.find(
			(el) =>
				new Date(
					(el as HTMLElement).innerText.split("-")[0].trim()
				).getDate() === startDate
		);
		return target?.id;
	}, data.startDate);

	// Select pay period option
	await page.click(`#${optionId}`);

	// Verify option selected
	await page.waitForSelector("#payPerdiodSelect-panel", { hidden: true });
	await screenshot(page, `select_pay_period_startDate_${data.startDate}`);
};

const getWorkweekId = async (page: Page, num: number) => {
	await page.waitForSelector("mat-expansion-panel-header");
	const workweekId = await page.evaluate(
		(weekNum: number) =>
			document.querySelectorAll("mat-expansion-panel-header")[weekNum].id,
		num
	);

	return workweekId;
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
	await page.waitForSelector(`#${locationId}`);
	await page.click(`#${locationId}`);

	// Get id for option
	await page.waitForSelector(`#${locationId}-panel`);
	const optionId = await page.evaluate(
		(selector: string, target: string) => {
			const options = Array.from(
				document.querySelectorAll<HTMLElement>(selector)
			);
			return options.find(
				(el) =>
					el.innerText.trim().toLowerCase() === target.trim().toLowerCase()
			)?.id;
		},
		`#${locationId}-panel mat-option`,
		location || "home"
	);

	// Select option
	await page.click(`#${optionId}`);
	await page.waitForSelector(`#${locationId}-panel`, { hidden: true });
};

const getWorkweekElementIds = async (page: Page, workweekId: string) => {
	await page.waitForSelector("mat-expansion-panel");
	const workweekElementIds = await page.evaluate((id: string) => {
		const workweek = Array.from(
			document.querySelectorAll("mat-expansion-panel")
		).find((el) => el.querySelector(`[id='${id}']`));
		const timeEntries = workweek
			? Array.from(workweek.querySelectorAll("[id^='evv-time-entry']")).filter(
					(el) => el.querySelector("input")
			  )
			: [];
		const saveButton = workweek?.querySelector("[id^='save-timesheet-button']");
		return {
			timeEntryIds: timeEntries.map((el) => el.id),
			saveButtonId: saveButton?.id,
		};
	}, workweekId);

	return workweekElementIds;
};

const getTimeEntryInfo = async (page: Page, timeEntryId: string) => {
	// Get input ids
	await page.waitForSelector(`#${timeEntryId}`);
	const inputIds = await page.evaluate((id: string) => {
		const timeEntry = document.querySelector(`#${id}`);
		const timeEntryDate = timeEntry?.querySelector<HTMLElement>(
			"[id^='workweekdays']"
		)?.innerText;

		const hoursId = timeEntry?.querySelector("input[id^='hours']")?.id;
		const minutesId = timeEntry?.querySelector("input[id^='minutes']")?.id;
		const startId = timeEntry?.querySelector("input[id^='starttime']")?.id;
		const endId = timeEntry?.querySelector("input[id^='endtime']")?.id;
		const locationId = timeEntry?.querySelector(
			"mat-select[id^='locationSelect']"
		)?.id;

		return { timeEntryDate, hoursId, minutesId, startId, endId, locationId };
	}, timeEntryId);

	return inputIds;
};

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

const fillTimeEntry = async (page: Page, timeEntryId: string, name: string) => {
	// Scroll to time entry
	await scrollIntoView(page, `#${timeEntryId}`);

	// Get input ids
	const inputIds = await getTimeEntryInfo(page, timeEntryId);
	const { timeEntryDate, hoursId, minutesId, startId, endId, locationId } =
		inputIds;
	const timeEntryArr = timeEntryDate
		? timeEntryDate.toLowerCase().split(/\s+/)
		: [];
	const [day, date] = timeEntryArr;

	const recipient = data.recipients[name as keyof typeof data.recipients];
	const isWeekend = day === "saturday" || day === "sunday";

	// Update location based on community value
	if (date in RecipientsExceptionMap[name]) {
		// Get default values
		const { hours, minutes, start, end, location } =
			RecipientsExceptionMap[name][date];

		// Fill out form for time entry
		await fillTimeEntryInputs(page, {
			hours: { id: hoursId, text: hours },
			minutes: { id: minutesId, text: minutes },
			start: { id: startId, text: start },
			end: { id: endId, text: end },
			location: {
				id: locationId,
				text: day === recipient.communityDay ? "community" : location,
			},
		});
	} else if (!isWeekend || (isWeekend && recipient.weekends)) {
		// Get default values
		const { hours, minutes, start, end, location } = recipient.default;

		// Fill out form for time entry
		await fillTimeEntryInputs(page, {
			hours: { id: hoursId, text: hours },
			minutes: { id: minutesId, text: minutes },
			start: { id: startId, text: start },
			end: { id: endId, text: end },
			location: {
				id: locationId,
				text: day === recipient.communityDay ? "community" : location,
			},
		});
	}

	await screenshot(page, `filled_timeEntry_${timeEntryId}`);
};

const fillWorkweek = async (page: Page, workweekId: string, name: string) => {
	// Toggle workweek panel
	const workweekToggle = await page.waitForSelector(`#${workweekId}`);
	await workweekToggle?.click();

	// Wait for panel
	await page.waitForSelector(".mat-expansion-panel-body");
	await screenshot(page, `toggle_workweek_${workweekId}`);

	// Fill time entries
	const { timeEntryIds, saveButtonId } = await getWorkweekElementIds(
		page,
		workweekId
	);
	for (const timeEntryId of timeEntryIds) {
		await fillTimeEntry(page, timeEntryId, name);
	}

	// Save
	const saveButton = await page.waitForSelector(`#${saveButtonId}`);
	await saveButton?.click();

	await screenshot(page, `filled_workweek_${workweekId}`);
};

const fillTimesheet = async (page: Page, name: string) => {
	// Select recipient
	await selectPerson(page, name);

	// Handle pop up 1
	await handlePopup(page);

	// Select pay period
	await selectPayPeriod(page);

	// Handle pop up 2
	await handlePopup(page);

	// Set up exceptions map
	RecipientsExceptionMap[name] = getExceptionMap(name);

	// Get workweek ids
	await page.waitForSelector("mat-expansion-panel");
	const numOfWorkweeks = await page.evaluate(
		() =>
			Array.from(document.querySelectorAll("mat-expansion-panel-header")).length
	);

	// Fill each workweeks
	for (let i = 0; i < numOfWorkweeks; i += 1) {
		const workweekId = await getWorkweekId(page, i);
		await fillWorkweek(page, workweekId, name);
	}

	// Go back to previous page
	const backButton = await page.waitForSelector("#backarrow");
	backButton?.click();

	// Wait for page to load
	await page.waitForSelector("text/Recipient Selection");
	await screenshot(page, "display_recipient_selection_page");
};

const fillTimesheets = async (page: Page) => {
	const names = Object.keys(data.recipients);
	for (const name of names) await fillTimesheet(page, name);
};

export default fillTimesheets;
