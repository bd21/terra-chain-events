import {getTxBlock, initHive} from "./hive";
import {createReturningLogFinder, LogFinderRule, ReturningLogFinderMapper} from "@terra-money/log-finder";

/**
 * Get xAstro fees from block 7375100 to block 7375200
 */
async function run(): Promise<void> {
    await initHive("https://hive-terra.everstake.one/graphql")

    const start = 7375100
    const end = 7375200

    const blockFees = new Set<XAstroFeeTransformed>();

    for(let height = start; start <= end; height++) {

        const txs = await getTxBlock(height);

        for (const tx of txs) {
            const Logs = tx.logs;
            const timestamp = tx.timestamp;
            const txHash = tx.txhash;

            for (const log of Logs) {
                const events = log.events;

                for (const event of events) {
                    // for spam tx
                    if (event.attributes.length < 1800) {

                        try {
                            // xAstro fees sent to maker
                            // get cw20 rewards
                            const astroCW20FeeLogFinder = createAstroCW20FeeLogFinder();
                            const astroCW20FeeLogFound = astroCW20FeeLogFinder(event);

                            if (astroCW20FeeLogFound) {
                                for (const found of astroCW20FeeLogFound) {
                                    const transformed = found.transformed;

                                    if (transformed != null) {
                                        blockFees.add({
                                            token: transformed.token,
                                            amount: transformed.amount,
                                        });
                                    }
                                }
                            }
                        } catch (e) {
                            console.log("Error during findXAstroFees: " + e);
                        }
                    }
                }
            }
        }
    }



}

export function createAstroCW20FeeLogFinder(): ReturningLogFinderMapper<
    XAstroFeeTransformed | undefined
    > {
    return createReturningLogFinder(xAstroCW20FeeRule(), (_, match) => {
        const token = match[0].value;
        const amount = match[4].value;

        const transformed = {
            token: token,
            amount: Number(amount),
        };
        return transformed;
    });
}

export interface XAstroFeeTransformed {
    token: string;
    amount: number;
}

export function xAstroCW20FeeRule(): LogFinderRule {
    return {
        type: "wasm",
        attributes: [
            ["contract_address"],
            ["action", "transfer"],
            ["from"],
            ["to", "terra12u7hcmpltazmmnq0fvyl225usn3fy6qqlp05w0"], // maker address
            ["amount"],
        ],
    };
}

run()