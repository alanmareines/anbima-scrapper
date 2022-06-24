import puppeteer from "puppeteer"
import chalk from "chalk"
import fs from "fs"

const readFile = async () => {
    const file = fs.readFileSync("fundList.json").toString()

    return await JSON.parse(file).map((fund) => fund.codigo_anbima)
}

const fetchFundPage = async (browser, fundCodes) => {
    const page = await browser.newPage()
    const funds = []

    page.on("response", async (res) => {
        if (res.url().match(/^https:\/\/data.anbima.com.br\/fundos-bff\/fundos\/\d{6}$/g)) {
            try {
                const anbimaApiResponse = await res.json()
                console.log(chalk.blueBright(res.url()))

                if (res.status() > 200) {
                    console.log(chalk.bgRedBright("ERROR => ", res.status()))
                    console.log(anbimaApiResponse)
                    fs.appendFileSync(
                        "errors.txt",
                        `{code: ${res.url().split("/").pop()}, error: ${error}}`,
                        () => console.log(chalk.bgRedBright("Error written in file"))
                    )
                }

                if (res.status() === 200) {
                    console.log(chalk.bgGreenBright(res.status()))
                    funds.push(anbimaApiResponse)
                }

                return
            } catch (error) {
                console.log(error)
                fs.appendFileSync(
                    "errors.txt",
                    `{code: ${res.url().split("/").pop()}, error: ${error}}`,
                    () => console.log(chalk.bgRedBright("Error written in file"))
                )
            }
        }
    })

    for (const [idx, code] of fundCodes.entries()) {
        console.log(chalk.bgYellowBright(`#${idx + 1} - Fundo ${code}`))
        await page.goto(`https://data.anbima.com.br/fundos/${code}`, {
            waitUntil: ["load", "networkidle2", "domcontentloaded"],
        })

        if ((idx + 1) % 100 === 0) fs.writeFileSync(`fundDetails${idx}.json`, JSON.stringify(funds))
    }
}

;(async () => {
    const fundCodes = await readFile()

    const browser = await puppeteer.launch()

    await fetchFundPage(browser, fundCodes)

    await browser.close()
})()
