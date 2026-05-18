/* eslint-disable no-bitwise */
import { USERNAMES } from '../constants/username.constant'

export interface IPartnerConfig {
	replaceProfilePicture?: boolean
	profilePictureCount?: number | string
	profilePicturePath?: string
	replaceUsername?: boolean
}

export interface IPartnerConfigs {
	[partnerId: string]: IPartnerConfig
}

export interface IGetPartnerProfilePictureParams {
	partnerId: string
	gameUserId: string
	currentProfilePicture: string
	partnerConfigs: IPartnerConfigs
}

export interface IGetPartnerUsernameParams {
	partnerId: string
	gameUserId: string
	currentUsername: string
	partnerConfigs: IPartnerConfigs
}

/**
 * MurmurHash3 32-bit hash function
 * Provides excellent distribution and performance for string hashing
 * @param str - String to hash
 * @param seed - Optional seed value (default: 0)
 * @returns 32-bit hash value
 */
const hashString = (str: string, seed: number = 0): number => {
	let h1 = seed
	const c1 = 0xcc9e2d51
	const c2 = 0x1b873593

	for (let i = 0; i < str.length; i += 1) {
		let k1 = str.charCodeAt(i)

		k1 = Math.imul(k1, c1)
		k1 = (k1 << 15) | (k1 >>> 17)
		k1 = Math.imul(k1, c2)

		h1 ^= k1
		h1 = (h1 << 13) | (h1 >>> 19)
		h1 = Math.imul(h1, 5) + 0xe6546b64
	}

	// Finalization
	h1 ^= str.length
	h1 ^= h1 >>> 16
	h1 = Math.imul(h1, 0x85ebca6b)
	h1 ^= h1 >>> 13
	h1 = Math.imul(h1, 0xc2b2ae35)
	h1 ^= h1 >>> 16

	return Math.abs(h1)
}

/**
 * Get partner-specific profile picture based on user ID hash
 */
export const getPartnerProfilePicture = ({
	partnerId,
	gameUserId,
	currentProfilePicture,
	partnerConfigs,
}: IGetPartnerProfilePictureParams): string => {
	const partnerConfig = partnerConfigs[partnerId]
	if (
		!partnerConfig ||
		!partnerConfig.replaceProfilePicture ||
		!partnerConfig.profilePicturePath
	) {
		return currentProfilePicture
	}
	const totalPicturesAvailable =
		Number(partnerConfig.profilePictureCount) > 0
			? Number(partnerConfig.profilePictureCount)
			: 10
	const hashOfUserId = (hashString(gameUserId) % totalPicturesAvailable) + 1
	return `${partnerConfig.profilePicturePath}/${hashOfUserId}.png`
}

/**
 * Get partner-specific username based on user ID hash
 */
export const getPartnerUsername = ({
	partnerId,
	gameUserId,
	currentUsername,
	partnerConfigs,
}: IGetPartnerUsernameParams): string => {
	const partnerConfig = partnerConfigs[partnerId]
	if (!partnerConfig || !partnerConfig.replaceUsername) {
		return currentUsername
	}
	const totalUsernamesAvailable = USERNAMES.length
	const hashOfUserId: number = hashString(gameUserId) % totalUsernamesAvailable
	return USERNAMES[hashOfUserId].toLowerCase()
}
