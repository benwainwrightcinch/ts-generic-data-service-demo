
/**
  * Need to build a type to
  *   - exclude entries from the data type that aren't in columns
  *   - change the return value to undefined if there are *no* columns
  */

/**
  * Generic type that represents a readonly array that
  * can only contain all the keys of D
  */
type ColumnsArray<D> = never

/*
 * Generic type that represents a subset of the Data Type (D),
 * picking only the keys present in C (which must extend ColumnsArray) 
 */
type DataSubset<D, C extends ColumnsArray<D>> = never

/**
 * Generic type that represents EITHER DataSubset OR the full Data Item
 * depending on whether C extends columnsArray
 */
type DataSubsetOrEverything<D, C extends ColumnsArray<D> | undefined> = never
 

export const getAll = async (columns?: string[]): Promise<Record<string, unknown>> => {

  // {{{
  return Promise.resolve(undefined)
  // }}}

}
