/**
 * Throws given error if $valueOrExpression is falsy
 * * alternative typescript strict true asset impl
 * * const assert: typeof assertModule.strict = assertModule.strict;
 */
export const assert: (
	valueOrExpression: unknown,
	messageOrError?: string | Error,
) => asserts valueOrExpression = (
	valueOrExpression: unknown,
	messageOrError?: string | Error,
): asserts valueOrExpression => {
	if (!valueOrExpression) {
		if (messageOrError instanceof Error) {
			throw messageOrError
		} else {
			throw new Error(messageOrError)
		}
	}
}
