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
exports.getCW20TokenHoldings = exports.getTxBlockBatch = exports.getTxBlock = exports.initHive = exports.hive = void 0;
const graphql_request_1 = require("graphql-request");
function initHive(URL) {
    exports.hive = new graphql_request_1.GraphQLClient(URL, {
        timeout: 10000,
        keepalive: true,
    });
    return exports.hive;
}
exports.initHive = initHive;
function getTxBlock(height) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield exports.hive.request((0, graphql_request_1.gql) `
                query ($height: Float!) {
                  tx {
                    byHeight(height: $height) {
                      timestamp
                      height
                      txhash
                      logs {
                        msg_index
                        events {
                          type
                          attributes {
                            key
                            value
                          }
                        }
                      }
                    }
                  }
                }
              `, { height });
            return (_a = response === null || response === void 0 ? void 0 : response.tx) === null || _a === void 0 ? void 0 : _a.byHeight;
        }
        catch (e) {
            return null;
        }
    });
}
exports.getTxBlock = getTxBlock;
/**
 * Fetch transactions by height in batches
 *
 * If the caller requires the block height for the blocks returned, it is
 * available in tx.height
 *
 * @param height The height to start at
 * @param blockCount The amount of blocks to retrieve in a single batch, defaults to 20
 * @returns The transactions for all blocks retrieved
 */
function getTxBlockBatch(height, blockCount = 20) {
    return __awaiter(this, void 0, void 0, function* () {
        const queries = [];
        for (let workingHeight = height; workingHeight <= height + blockCount; workingHeight++) {
            queries.push({
                document: (0, graphql_request_1.gql) `
        query ($height: Float!) {
          tx {
            byHeight(height: $height) {
              height
              timestamp
              height
              txhash
              logs {
                msg_index
                events {
                  type
                  attributes {
                    key
                    value
                  }
                }
              }
            }
          }
        }
      `,
                variables: { height: workingHeight },
            });
        }
        // Collection of transactions for each block
        const blocksTxs = [];
        try {
            const responses = yield exports.hive.batchRequests(queries);
            for (const [index, item] of responses.entries()) {
                blocksTxs.push(item.data.tx.byHeight);
            }
        }
        catch (e) {
            // If we fail, return null to ensure we handle the failure
            return null;
        }
        return blocksTxs;
    });
}
exports.getTxBlockBatch = getTxBlockBatch;
/**
 * Retrieve the current CW20 holdings of a wallet for the given list of tokens
 * by using batched requests in groups of 30
 *
 * @param tokenContracts The list of addresses of the CW20 tokens
 * @param walletAddress The address of the wallet
 * @param batchSize The amount of contracts to query in a request, default to 30
 * @returns The current balances of tokenContracts in walletAddress in key value pairs
 */
const getCW20TokenHoldings = (tokenContracts, walletAddress, batchSize = 30) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Break tokenContacts into batches of batchSize
    const batchItems = (items) => items.reduce((batches, item, index) => {
        const batch = Math.floor(index / batchSize);
        batches[batch] = [].concat(batches[batch] || [], item);
        return batches;
    }, []);
    // Construct the batch requests and compile the results
    const batches = batchItems(tokenContracts);
    const tokenHoldings = new Map();
    for (const batch of batches) {
        // For batchRequest you need to specify a GraphQL document and variables
        // for each query in the batch. The query document stays static in this case
        // with only the tokenContract variable changing
        const queries = [];
        for (const tokenContract of batch) {
            queries.push({
                document: (0, graphql_request_1.gql) `
          query ($tokenContract: String!, $walletAddress: String!) {
            wasm {
              contractQuery(
                contractAddress: $tokenContract
                query: { balance: { address: $walletAddress } }
              )
            }
          }
        `,
                variables: { tokenContract, walletAddress },
            });
        }
        try {
            // Map the resulting balances back to the original contract addresses
            const responses = yield exports.hive.batchRequests(queries);
            for (const [index, item] of responses.entries()) {
                if (queries[index]) {
                    tokenHoldings.set((_a = queries[index].variables) === null || _a === void 0 ? void 0 : _a.tokenContract, item.data.wasm.contractQuery.balance);
                }
            }
        }
        catch (e) {
            // If we fail, return what we have
            return tokenHoldings;
        }
    }
    return tokenHoldings;
});
exports.getCW20TokenHoldings = getCW20TokenHoldings;
//# sourceMappingURL=hive.js.map