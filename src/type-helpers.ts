// #region Type utilities
export type RequiredKeysOf<TType extends object> = TType extends any
	? Exclude<
			{
				[Key in keyof TType]: TType extends Record<Key, TType[Key]> ? Key : never;
			}[keyof TType],
			undefined
		>
	: never;

export type HasRequiredKeys<TType extends object> = RequiredKeysOf<TType> extends never ? false : true;

// #endregion

// #region Type definitions for call method
export type Namespaced<T> = { mainSchema: T };

// #endregion