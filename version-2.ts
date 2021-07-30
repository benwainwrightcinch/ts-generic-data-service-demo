import aws from 'aws-sdk'
import { DocumentClient, ScanInput } from 'aws-sdk/clients/dynamodb'
import pMap from 'p-map'

interface Vehicle {
  windows: number
  name: string
  canFly: boolean
}

const scanConcurrency = 8

const getSafeSelectByfieldParms = (field: string, value: string) => ({
  KeyConditionExpression: `#fieldName = :${field}`,
  ExpressionAttributeNames: { '#fieldName': String(field) },
  ExpressionAttributeValues: {
    [`:${field}`]: value,
  },
})

const parallelScan = async (scanParams: ScanInput): Promise<Record<string, unknown>[]> => {

  // {{{
  const dynamoDb = new aws.DynamoDB.DocumentClient({
    httpOptions: {
      timeout: 60000 * 5, // 5 minutes
    },
  })

  const segmentIndexes = [...Array(scanConcurrency).keys()]
  const docs: Record<string, unknown>[] = []

  await pMap(segmentIndexes, async (_, segmentIndex) => {
    let ExclusiveStartKey: DocumentClient.Key | undefined

    const params: DocumentClient.ScanInput = {
      ...scanParams,
      Segment: segmentIndex,
      TotalSegments: scanConcurrency,
    }

    do {
      if (ExclusiveStartKey) {
        params.ExclusiveStartKey = ExclusiveStartKey
      }

      const { Items, LastEvaluatedKey } = await dynamoDb.scan(params).promise()
      ExclusiveStartKey = LastEvaluatedKey

      docs.push(...((Items ?? []) as T[]))
    } while (ExclusiveStartKey)
  })

  return docs
  // }}}

}

export default class DataService {

  private getTableParams(prefix: string) {
    return { TableName: `${prefix}${process.env.SERVERLESS_STAGE}` }
  }

  private dynamoDb: DocumentClient

  constructor(private tableNamePrefix: string) {
    this.dynamoDb = new aws.DynamoDB.DocumentClient()
  }

  async putItem(item: Record<string, unknown>): Promise<void> {

    // {{{
    await this.dynamoDb
      .put({
        ...this.getTableParams(this.tableNamePrefix),
        Item: item,
      })
      .promise()
    // }}}
      
  }

  async waitForItemByFieldToBeConsistent(field: string, value: string): Promise<void> {

    // {{{
    await this.dynamoDb
      .query({
        ...this.getTableParams(this.tableNamePrefix),
        ...getSafeSelectByfieldParms(String(field), value),
        ConsistentRead: true,
      })
      .promise()
    // }}}

  }

  async getItemsByField(field: string, value: string): Promise<Record<string, unknown>[]> {
    
    // {{{
    const result = await this.dynamoDb
      .query({
        ...this.getTableParams(this.tableNamePrefix),
        ...getSafeSelectByfieldParms(String(field), value),
      })
      .promise()

    return (result.Items ?? []) as Record<string, unknown>[]
    // }}}

  }

  async getAll(columns: string[]): Promise<Record<string, unknown>[]> {

    // {{{
    interface ExpressionAttributeNames {
      [key: string]: string
    }

    const expressionAttributeNames = columns?.reduce<ExpressionAttributeNames>((accum, item) => {
      accum[`#${item}`] = String(item)
      return accum
    }, {})

    const projectionExpression = Object.keys(expressionAttributeNames ?? {}).join(',')

    const scanParams: ScanInput = columns
      ? {
          ...this.getTableParams(this.tableNamePrefix),
          ProjectionExpression: projectionExpression,
          ExpressionAttributeNames: expressionAttributeNames,
        }
      : this.getTableParams(this.tableNamePrefix)

    return await parallelScan(scanParams)
    // }}}

  }
}
