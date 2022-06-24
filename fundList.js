import puppeteer from "puppeteer"
import chalk from "chalk"
import fs from "fs"

const getAllAnbimaCodes = async (browser) => {
    let fundList = []

    const page = await browser.newPage()

    await page.goto("https://data.anbima.com.br/fundos?page=1&size=100&", {
        waitUntil: "networkidle2",
    })

    const pageLimit = await page.evaluate(() => {
        return Number(
            document.querySelector("#pagination > div.anbima-ui-pagination__right > span > a")
                .innerText
        )
    })

    console.log(chalk.yellowBright("**Page Limit** "), chalk.blueBright(pageLimit))

    page.on("response", async (res) => {
        if (res.url().includes("https://data.anbima.com.br/fundos-bff/fundos?")) {
            const anbimaApiResponse = await res.json()

            if (res.status() > 200) {
                console.log(chalk.bgRedBright("ERROR => ", res.status()))
                console.log(anbimaApiResponse)
            }

            if (res.status() === 200) {
                console.log(chalk.bgGreenBright(res.status()))
                fundList.push(...anbimaApiResponse.content)
            }

            return
        }
    })

    for (let idx = 1; idx < pageLimit; idx++) {
        console.log(chalk.bgCyan(`Page ${idx}`))
        await page.goto(`https://data.anbima.com.br/fundos?page=${idx}&size=100&`, {
            waitUntil: "networkidle2",
        })
    }

    fs.writeFileSync("fundList.json", JSON.stringify(fundList))
}

;(async () => {
    const browser = await puppeteer.launch()

    await getAllAnbimaCodes(browser)

    await browser.close()
})()
