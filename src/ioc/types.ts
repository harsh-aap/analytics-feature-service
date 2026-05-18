export const TYPES = {
	// Connectors
	OdinConnector: Symbol.for('OdinConnector'),
	KafkaConnector: Symbol.for('KafkaConnector'),
	RedisConnector: Symbol.for('RedisConnector'),
	MongoConnector: Symbol.for('MongoConnector'),

	// DB / cache primitives from tst-base
	RedisDb: Symbol.for('RedisDb'),
	CacheContext: Symbol.for('CacheContext'),
	MongoDb: Symbol.for('MongoDb'),

	// Feature pipeline
	FeatureConsumer: Symbol.for('FeatureConsumer'),
	FeatureService: Symbol.for('FeatureService'),
	FeatureValidator: Symbol.for('FeatureValidator'),
	FeatureRepository: Symbol.for('FeatureRepository'),
	BuilderRegistry: Symbol.for('BuilderRegistry'),

	// Individual feature builders — kept as named symbols so Inversify can
	// resolve them and the registry can take an explicit, ordered set.
	CoreFeatureBuilder: Symbol.for('CoreFeatureBuilder'),
	PurchaseFeatureBuilder: Symbol.for('PurchaseFeatureBuilder'),
	CartFeatureBuilder: Symbol.for('CartFeatureBuilder'),
	SignupFeatureBuilder: Symbol.for('SignupFeatureBuilder'),
	LoginFeatureBuilder: Symbol.for('LoginFeatureBuilder'),
	SearchFeatureBuilder: Symbol.for('SearchFeatureBuilder'),

	// Misc
	IdempotencyService: Symbol.for('IdempotencyService'),
} as const
