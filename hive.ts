import {BatchRequestDocument, gql, GraphQLClient} from "graphql-request";

export let hive: GraphQLClient;

export function initHive(URL: string): GraphQLClient {
    hive = new GraphQLClient(URL, {
        timeout: 10000,
        keepalive: true,
    });

    return hive;
}


export async function getTxBlock(height: number) {
    try {
        const response = await hive.request(
            gql`
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
              `,
    { height }
        );

        return response?.tx?.byHeight;
    } catch (e) {
        return null;
    }
}

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
export async function getTxBlockBatch(height: number, blockCount: number = 20) {
    const queries: BatchRequestDocument[] = [];
    for (let workingHeight = height; workingHeight <= height + blockCount; workingHeight++) {
        queries.push({
            document: gql`
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
        const responses = await hive.batchRequests(queries);
        for (const [index, item] of responses.entries()) {
            blocksTxs.push(item.data.tx.byHeight);
        }
    } catch (e) {
        // If we fail, return null to ensure we handle the failure
        return null;
    }
    return blocksTxs;
}


/**
 * Retrieve the current CW20 holdings of a wallet for the given list of tokens
 * by using batched requests in groups of 30
 *
 * @param tokenContracts The list of addresses of the CW20 tokens
 * @param walletAddress The address of the wallet
 * @param batchSize The amount of contracts to query in a request, default to 30
 * @returns The current balances of tokenContracts in walletAddress in key value pairs
 */
export const getCW20TokenHoldings = async (
    tokenContracts: string[],
    walletAddress: string,
    batchSize: number = 30
): Promise<Map<string, number>> => {
    // Break tokenContacts into batches of batchSize
    const batchItems = (items: string[]) =>
        items.reduce((batches: string[][], item: string, index) => {
            const batch = Math.floor(index / batchSize);
            batches[batch] = ([] as string[]).concat(batches[batch] || [], item);
            return batches;
        }, []);

    // Construct the batch requests and compile the results
    const batches = batchItems(tokenContracts);
    const tokenHoldings: Map<string, number> = new Map();
    for (const batch of batches) {
        // For batchRequest you need to specify a GraphQL document and variables
        // for each query in the batch. The query document stays static in this case
        // with only the tokenContract variable changing
        const queries: BatchRequestDocument[] = [];
        for (const tokenContract of batch) {
            queries.push({
                document: gql`
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
            const responses = await hive.batchRequests(queries);
            for (const [index, item] of responses.entries()) {
                if (queries[index]) {
                    tokenHoldings.set(
                        queries[index].variables?.tokenContract,
                        item.data.wasm.contractQuery.balance
                    );
                }
            }
        } catch (e) {
            // If we fail, return what we have
            return tokenHoldings;
        }
    }
    return tokenHoldings;
};

