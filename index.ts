import { chromium } from "playwright";
import { format, subDays } from "date-fns";
import { writeFile } from "fs/promises";

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const scraping = async () => {
  const browser = await chromium.launch({
    args: [
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--window-size=1920,1080",
      "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36",
      "--start-maximized",
      "--start-fullscreen",
      "--remote-debugging-port=9222",
    ],
  });

  try {
    const screenName = "tmgnrei";
    const today = new Date();
    const yesterday = subDays(today, 1);
    const url = encodeURI(
      `https://twitter.com/search?q=from:${screenName} min_faves:10 until:${format(
        today,
        "yyyy-MM-dd"
      )} since:${format(yesterday, "yyyy-MM-dd")} -filter:replies&f=live`
    );
    // `https://twitter.com/search?q=from:tmgnrei until:2022-07-20 since:2022-07-19 -filter:replies&src=recent_search_click`
    console.log(url);
    const page = await browser.newPage();
    await page.goto(url, { timeout: 10000 });
    await page.waitForSelector('div[aria-label="Timeline: Search timeline"]', {
      timeout: 10000,
    });

    page.evaluate(
      `
        var intervalID = setInterval(function () {
            var scrollingElement = (document.scrollingElement || document.body);
            scrollingElement.scrollTop = scrollingElement.scrollHeight;
        }, 500);
        `
    );
    let prevHeight: number | null = null;
    while (true) {
      const currHeight: number = await page.evaluate(
        "(window.innerHeight + window.scrollY)"
      );
      if (prevHeight === currHeight) {
        page.evaluate("clearInterval(intervalID)");
        break;
      } else {
        prevHeight = currHeight;
        await sleep(1000);
      }
    }

    const buffer = await page.screenshot({
      type: "png",
      fullPage: true,
    });
    const allTweets = page.locator(
      'div[aria-label="Timeline: Search timeline"] > div > div'
    );
    const count = await allTweets.count();
    for (let i = 0; i < count; i++) {
      const tweet = await allTweets
        .nth(i)
        .locator('div[data-testid="tweetText"]')
        .innerText();
      console.log(tweet);
    }
    await writeFile("screenshot.png", buffer);
    await page.close();
    const finishedAt = new Date();
  } catch (e: any) {
    console.log(e);
    await browser.close();
  }
};

scraping();
