/**
 * Constructs a standardized queue name.
 * @param {string} serviceName - The name of the service.
 * @param {string} actionName - The name of the action for which the queue is being created.
 * @returns The standardized queue name.
 */
export const getQueueName = (serviceName: string, actionName: string): string => {
	return `${serviceName}_${actionName}`
}

/**
 * Constructs a standardized DLQ name.
 * @param {string} serviceName - The name of the service.
 * @param {string} actionName - The name of the action for which the DLQ is being created.
 * @returns The standardized DLQ name.
 */
export const getDLQName = (serviceName: string, actionName: string): string => {
	return `${getQueueName(serviceName, actionName)}_DLQ`
}
