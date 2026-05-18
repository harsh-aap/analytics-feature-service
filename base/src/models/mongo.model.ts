export interface MongoDBConfig {
	host?: string
	port?: number
	prefix?: string
	database?: string
	authEnabled?: boolean
	userName?: string
	password?: string
	replicasetHosts?: string
	replicaSetName?: string
	replicaSetEnabled?: boolean
	minPoolSize?: number
	maxPoolSize?: number
	maxStalenessSeconds?: number
	retryWrites?: boolean
	secretName?: string
}
