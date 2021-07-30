import { vehicleStateDataService } from "./version-1"
import { DataService, Vehicle } from "./version-2"
import { NewDataService } from "./version-3"


(async () => {
  // This was version one
  vehicleStateDataService.getItemById("_id")

  // Nice and generic?
  const service = new DataService("VehicleState")
  const theVehicle = (await service.getAll())[0]

  console.log(`Our vehicle has ${theVehicle.windows} windows`)

  console.log(`Our vehicle also has ${theVehicle.legs} legs`) // :-( why no error, TypeScript?

  // Lets make it better :-)
  const thing = new NewDataService("VehicleState")

  const foo = (await thing.getAll(["windows", "canFly"]))[0]

  foo.windows
  foo.name
  foo.canFly
  foo.bar
})()
