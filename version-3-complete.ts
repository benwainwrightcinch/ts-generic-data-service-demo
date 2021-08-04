import aws from 'aws-sdk'
import { DocumentClient, ScanInput } from 'aws-sdk/clients/dynamodb'
import pMap from 'p-map'

export interface Vehicle {
  windows: number
  name: string
  canFly: boolean
}

interface Person {
  hands: number
}

interface TableNameTypes {
  "vehiclesTable": Vehicle,
  "personTable": Person
}

const scanConcurrency = 8

const getSafeSelectByfieldParms = (field: string, value: string) => ({
  KeyConditionExpression: `#fieldName = :${field}`,
  ExpressionAttributeNames: { '#fieldName': String(field) },
  ExpressionAttributeValues: {
    [`:${field}`]: value,
  },
})

const parallelScan = async <T>(scanParams: ScanInput): Promise<T[]> => {

  // {{{
  const dynamoDb = new aws.DynamoDB.DocumentClient({
    httpOptions: {
      timeout: 60000 * 5, // 5 minutes
    },
  })

  const segmentIndexes = [...Array(scanConcurrency).keys()]
  const docs: T[] = []

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

type ColumnsArray<D> = ReadonlyArray<keyof D>
type DataSubset<D, C extends ColumnsArray<D>> = Pick<D, C[number]>

type DataSubsetOrEverything<D, C extends ColumnsArray<D> | undefined> = C extends ColumnsArray<D> 
                  ? DataSubset<D, C>
                  : D

export class NewDataService<TN extends keyof TableNameTypes> {

  private getTableParams(prefix: string) {
    return { TableName: `${prefix}${process.env.SERVERLESS_STAGE}` }
  }

  private dynamoDb: DocumentClient

  constructor(private tableNamePrefix: TN) {
    this.dynamoDb = new aws.DynamoDB.DocumentClient()
  }

  async putItem(item: TableNameTypes[TN]): Promise<void> {

    // {{{
    await this.dynamoDb
      .put({
        ...this.getTableParams(this.tableNamePrefix),
        Item: item,
      })
      .promise()
    // }}}
      
  }

  async waitForItemByFieldToBeConsistent(field: keyof TableNameTypes[TN], value: string): Promise<void> {

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

  async getItemsByField(field: string, value: string): Promise<TableNameTypes[TN][]> {
    
    // {{{
    const result = await this.dynamoDb
      .query({
        ...this.getTableParams(this.tableNamePrefix),
        ...getSafeSelectByfieldParms(String(field), value),
      })
      .promise()

    return (result.Items ?? []) as TableNameTypes[TN][]
    // }}}

  }

  async getAll<C extends ColumnsArray<TableNameTypes[TN]>>(columns?: C): Promise<DataSubsetOrEverything<TableNameTypes[TN], C>[]> {

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
