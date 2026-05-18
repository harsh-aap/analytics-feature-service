// errors
import { ApiError } from './errors/api.error'
import { NotFoundError } from './errors/notFound.error'
import { TooManyRequestsError } from './errors/tooManyRequests.error'
import { ValidationError } from './errors/validation.error'
import { appContextMiddleware } from './middlewares/createAppContext.middleware'
import { gameContextMiddleware } from './middlewares/createGameContext.middleware'
import { ensureRequestId } from './middlewares/ensureRequestId.middleware'
import { errorHandler } from './middlewares/error.middleware'
import { notFoundMiddleware } from './middlewares/notFound.middleware'
import { validateUser } from './middlewares/user.middleware'
import {
	CustomRequest,
	RequestParts,
	ValidatedRequestParts,
	asyncHandler,
	requestPartToValidatedRequestPart,
} from './utils/request.util'
import { ResponseUtil } from './utils/response.util'

export * from './middlewares/validation.middleware'
export * from './errors/async.error'

export { ValidationError, ApiError, TooManyRequestsError, NotFoundError }
export {
	errorHandler,
	validateUser,
	ensureRequestId,
	appContextMiddleware,
	gameContextMiddleware,
	notFoundMiddleware,
}

// utils
export {
	CustomRequest,
	RequestParts,
	ValidatedRequestParts,
	requestPartToValidatedRequestPart,
	ResponseUtil,
	asyncHandler,
}
