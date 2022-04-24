"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.xAstroCW20FeeRule = exports.createAstroCW20FeeLogFinder = void 0;
const hive_1 = require("./hive");
const log_finder_1 = require("@terra-money/log-finder");
/**
 * Get xAstro fees from block 7375100 to block 7375200
 */
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, hive_1.initHive)("https://hive-terra.everstake.one/graphql");
        const start = 7375100;
        const end = 7375200;
        const blockFees = new Set();
        for (let height = start; start <= end; height++) {
            const txs = yield (0, hive_1.getTxBlock)(height);
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
                            }
                            catch (e) {
                                console.log("Error during findXAstroFees: " + e);
                            }
                        }
                    }
                }
            }
        }
    });
}
function createAstroCW20FeeLogFinder() {
    return (0, log_finder_1.createReturningLogFinder)(xAstroCW20FeeRule(), (_, match) => {
        const token = match[0].value;
        const amount = match[4].value;
        const transformed = {
            token: token,
            amount: Number(amount),
        };
        return transformed;
    });
}
exports.createAstroCW20FeeLogFinder = createAstroCW20FeeLogFinder;
function xAstroCW20FeeRule() {
    return {
        type: "wasm",
        attributes: [
            ["contract_address"],
            ["action", "transfer"],
            ["from"],
            ["to", "terra12u7hcmpltazmmnq0fvyl225usn3fy6qqlp05w0"],
            ["amount"],
        ],
    };
}
exports.xAstroCW20FeeRule = xAstroCW20FeeRule;
run();
//# sourceMappingURL=run.js.map