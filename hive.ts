import {BatchRequestDocument, gql, GraphQLClient} from "graphql-request";

export let hive: GraphQLClient;

export function initHive(URL: string): GraphQLClient {
    hive = new GraphQLClient(URL, {
        timeout: 10000,
        keepalive: true,
    });

    return hive;
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
