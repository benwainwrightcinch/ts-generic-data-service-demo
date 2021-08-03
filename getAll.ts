
/**
  * Need to build a type to
  *   - exclude entries from the data type that aren't in columns
  *   - change the return value to undefined if there are *no* columns
  */

type ColumnsArray<D> =

// Notes for Ben - C extends CA<D> or undefined. Use C[number] to get union type
type DataSubset<D, C>  =

export const getAll = async (columns?: string): Promise<Record<string, unknown>> => {
  return Promise.resolve(undefined)
}
