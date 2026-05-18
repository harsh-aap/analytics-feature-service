export const removeLeadingSlash = (input: string): string => {
	return input.replace(/^\/|\/$/g, '')
}

export const createZkPath = (...parts: string[]): string => {
	// Remove any leading or trailing slashes from each part
	const cleanParts = parts.map((part) => part.replace(/^\/|\/$/g, ''))

	// Join the parts with a single slash
	const path = `/${cleanParts.filter((part) => part).join('/')}`
	return path
}

export const getChildNode = (servicePath: string, fullPath: string): string => {
	const servicePathParts = servicePath.split('/')
	const fullPathParts = fullPath.split('/')
	fullPathParts.splice(0, servicePathParts.length)
	return createZkPath(...fullPathParts)
}
