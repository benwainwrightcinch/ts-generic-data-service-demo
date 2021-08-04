import { vehicleStateDataService } from "./version-1"
import { DataService } from "./version-2"
import { NewDataService } from "./version-3"

export interface Vehicle {
  windows: number,
  name: string,
  canFly: boolean
}

(async () => {
  // Version one
  const anotherVehicle = await vehicleStateDataService.getItemById("_id")

  // this is actually pretty type safe, look:
  anotherVehicle.canFly // Works fine
  anotherVehicle.canSing // Error! :D Thanks TypeScript!

  vehicleStateDataService.putItem(
    {
      canFly: true,
      windows: 3,
      name: "VroomVroom"
    }
  )

  vehicleStateDataService.putItem( // Error -> Property missing
    {
      windows: 3,
      name: "VroomVroom"
    }
  )
})();



(async () => {
  // Ok, lets try version two
  
  // Whoops
  const dataService = new DataService("notTheVehiclesTable")

  const anotherVehicle = (await dataService.getItemsByField("_id", "231"))[0]
  // Wait a second, there is no _id field on vehicle. Whoops...

  anotherVehicle.canSing // No error, oh noes
  anotherVehicle.canFly  // Seems to work

  // Both are typed 'unknown' -> requires manual type checking or type casting

  await dataService.putItem( // Well I've really messed up my data model now...
    {
      takes: "absolutely",
      anything: "at all"
    }
  )

  // uh... what? Is that even a property?
  await dataService.waitForItemByFieldToBeConsistent("numberOfWings", "3")

  const subsetOfVehicle = await dataService.getAll(["canFly"])[0]

  subsetOfVehicle.canFly
  subsetOfVehicle.name // Wait a second, we've not asked for the name, we only asked for canFly

  vehicleStateDataService.putItem(
    {
      canFly: true,
      windows: 3,
      name: "VroomVroom"
    }
  )
})();

(async () => {

  // Lets try to make stuff better
  const dataService = new NewDataService("notTheVehiclesTable")

  const anotherVehicle = (await dataService.getItemsByField("_id", "231"))[0]

  anotherVehicle.canSing 
  anotherVehicle.canFly 

  await dataService.putItem(
    {
      takes: "absolutely",
      anything: "at all"
    }
  )

  await dataService.waitForItemByFieldToBeConsistent("numberOfWings", "3")

  const subsetOfVehicle = await dataService.getAll(["canFly"])[0]

  subsetOfVehicle.canFly
  subsetOfVehicle.name

  vehicleStateDataService.putItem(
    {
      canFly: true,
      windows: 3,
      name: "VroomVroom"
    }
  )
})()
