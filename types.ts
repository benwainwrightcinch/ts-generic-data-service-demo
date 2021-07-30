// Use the type of the first argument to construct the correct return type 

// If we make the function generic, typescript will infer a type parameter which we can then use for this purpose


// Steps
// - Generic type which is a read only array of all the keys of the object (D)
// - Generic type taking C and D which 'Pick' s from D using C[number]
// - Conditional type - if C extends the array, pick, otherwise D


export const getAll = <T extends undefined>(columns?: string): Promise<T> => {

  // {{{
  return Promise.resolve(undefined)
  // }}}

}

// Notes:
//   - TypeScript must infer ALL types or it will infer NO types
//   - We wouldn't need to do this if it wasn't a generic function.
//     Normally, TS will just *infer* the return type for you
