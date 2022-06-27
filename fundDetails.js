import puppeteer from "puppeteer"
import chalk from "chalk"
import flatten from "flat"
import fs from "fs"

const readFile = async () => {
    const file = fs.readFileSync("fundList.json").toString()

    return await JSON.parse(file).map((fund) => fund.codigo_anbima)
}

const retriveFund = async (page) => {
    await page.setDefaultNavigationTimeout(0)
    page.on("response", async (res) => {
        if (res.url().match(/^https:\/\/data.anbima.com.br\/fundos-bff\/fundos\/\d{6}$/g)) {
            try {
                const anbimaApiResponse = await res.json()
                console.log(chalk.blueBright(res.url()))

                if (res.status() > 200) {
                    console.log(chalk.bgRedBright("ERROR => ", res.status()))
                    fs.appendFileSync(
                        "errors.txt",
                        `{code: ${res.url().split("/").pop()}, error: ${JSON.stringify(
                            anbimaApiResponse
                        )}}\n`,
                        () => console.log(chalk.bgRedBright("Error written in file"))
                    )
                }

                if (res.status() === 200) {
                    console.log(chalk.bgGreenBright(res.status()))

                    const fileExist = fs.existsSync("fundDetails.csv")

                    if (!fileExist) {
                        fs.writeFileSync(
                            "fundDetails.csv",
                            `${Object.keys(flatten(anbimaApiResponse, { delimiter: "_" })).join(
                                ","
                            )}\n${Object.values(
                                flatten(anbimaApiResponse, { delimiter: "_" })
                            ).join(",")}\n`
                        )
                    }

                    fs.appendFileSync(
                        "fundDetails.csv",
                        `${Object.values(flatten(anbimaApiResponse, { delimiter: "_" })).join(
                            ","
                        )}\n`
                    )

                    // const file = fs.readFileSync("fundDetails.json").toString()
                    // const newContent = await JSON.parse(file)
                    // newContent.push(anbimaApiResponse)
                    // fs.writeFileSync("fundDetails.json", JSON.stringify(newContent))
                    // return
                }

                return null
            } catch (error) {
                console.log(error)
                fs.appendFileSync(
                    "errors.txt",
                    `{code: ${res.url().split("/").pop()}, error: ${error}}\n`,
                    () => console.log(chalk.bgRedBright("Error written in file"))
                )
            }
        }
    })
}

const fetchFundPage = async (browser, fundCodes) => {
    const page = await browser.newPage()

    retriveFund(page)

    for (const [idx, code] of fundCodes.entries()) {
        console.log(chalk.bgYellowBright(`#${idx} - Fundo ${code}`))
        await page.goto(`https://data.anbima.com.br/fundos/${code}`, {
            waitUntil: ["load", "networkidle2", "domcontentloaded"],
        })
    }
}

const runner = async () => {
    const fundCodes = await readFile()

    const browser = await puppeteer.launch()

    await fetchFundPage(browser, fundCodes)

    await browser.close()
}

runner()
