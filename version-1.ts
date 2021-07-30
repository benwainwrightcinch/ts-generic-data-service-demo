interface Vehicle {
  windows: number,
  name: string,
  canFly: boolean
}

import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import pMap from 'p-map'
import AWS from "aws-sdk"

const buildDefaultParams = () => {
  const stage = process.env.SERVERLESS_STAGE
  const tableName = `Product_VehicleState_${stage}`
  return {
    TableName: tableName,
  }
}

const dynamoDb = new AWS.DynamoDB.DocumentClient()

export const vehicleStateDataService = {
  putItem: async (vehicle: Vehicle): Promise<void> => {
    await dynamoDb
      .put({
        ...buildDefaultParams(),
        Item: vehicle,
      })
      .promise()
  },

  getItemById: async (id: string): Promise<Vehicle | undefined> => {
    const result = await dynamoDb
      .query({
        ...buildDefaultParams(),
        KeyConditionExpression: 'vehicleInventoryId = :hkey',
        ExpressionAttributeValues: {
          ':hkey': id,
        },
      })
      .promise()

    return (result.Items ? result.Items[0] : undefined) as Vehicle
  },

  waitForVehicleToBeConsistent: async (id: string) => {
    await dynamoDb
      .query({
        ...buildDefaultParams(),
        KeyConditionExpression: 'vehicleInventoryId = :hkey',
        ExpressionAttributeValues: {
          ':hkey': id,
        },
        ConsistentRead: true,
      })
      .promise()
  },

  getAll: async (): Promise<string[]> => {
    const dynamoDb = new AWS.DynamoDB.DocumentClient({
      httpOptions: {
        timeout: 60000 * 5, // 5 minutes
      },
    })

    return [...new Set((await parallelScan(dynamoDb)).map((x) => x.vehicleInventoryId as string))]
  },

  getAllVehicleCapEnrichmentFields: async (): Promise<CapEnrichmentField[]> => {
    const dynamoDb = new AWS.DynamoDB.DocumentClient({
      httpOptions: {
        timeout: 60000 * 5, // 5 minutes
      },
    })

    return (await parallelScan(dynamoDb))
      .map((x) => {
        return {
          vehicleInventoryId: x.vehicleInventoryId as string,
          capId: x.capId as number,
          registrationDate: x.registrationDate as string,
          capRegistrationOverrideDate: x.capRegistrationOverrideDate as string,
        }
      })
      .reduce((vehicles, nextVehicle) => {
        const existingVehicle = vehicles.find((v) => v.vehicleInventoryId === nextVehicle.vehicleInventoryId)
        if (!existingVehicle) {
          return [...vehicles, nextVehicle] as CapEnrichmentField[]
        }

        return vehicles
      }, [] as CapEnrichmentField[])
  },
}

const parallelScan = async (dynamoDb: AWS.DynamoDB.DocumentClient): Promise<DocumentClient.ItemList> => {
  const segmentIndexes = [...Array(8).keys()]
  const docs: DocumentClient.ItemList = []

  await pMap(segmentIndexes, async (_, segmentIndex) => {
    let ExclusiveStartKey: DocumentClient.Key | undefined

    const params: DocumentClient.ScanInput = {
      ...buildDefaultParams(),
      Segment: segmentIndex,
      TotalSegments: 8,
    }

    do {
      if (ExclusiveStartKey) {
        params.ExclusiveStartKey = ExclusiveStartKey
      }

      const { Items, LastEvaluatedKey } = await dynamoDb.scan(params).promise()
      ExclusiveStartKey = LastEvaluatedKey

      docs.push(...(Items ?? []))
    } while (ExclusiveStartKey)
  })

  return docs
}

export interface CapEnrichmentField {
  vehicleInventoryId: string
  capId: number
  registrationDate: string
  capRegistrationOverrideDate?: string
}
