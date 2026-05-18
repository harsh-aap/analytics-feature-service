import { Container, decorate, injectable } from 'inversify'
import { CacheContext, MongoDb, RedisDb } from 'tst-base'

import { TYPES } from './types'
import {
	KafkaConnector,
	MongoConnector,
	OdinConnector,
	RedisConnector,
} from '../connectors'
import { FeatureConsumer } from '../module/feature/async/consumer'
import {
	BuilderRegistry,
	CartFeatureBuilder,
	CoreFeatureBuilder,
	LoginFeatureBuilder,
	PurchaseFeatureBuilder,
	SearchFeatureBuilder,
	SignupFeatureBuilder,
} from '../module/feature/builders'
import { FeatureService } from '../module/feature/feature.service'
import { FeatureValidator } from '../module/feature/feature.validator'
import { IdempotencyService } from '../module/feature/idempotency.service'
import { FeatureRepository } from '../module/feature/repositories/feature.repository'

// tst-base classes aren't decorated with @injectable() upstream; mark them so
// inversify can construct them. Safe to decorate idempotently across reloads.
decorate(injectable(), RedisDb)
decorate(injectable(), CacheContext)
decorate(injectable(), MongoDb)

export const setUpBindings = (container: Container): void => {
	// Connectors
	container.bind<OdinConnector>(TYPES.OdinConnector).to(OdinConnector)
	container.bind<KafkaConnector>(TYPES.KafkaConnector).to(KafkaConnector)
	container.bind<RedisConnector>(TYPES.RedisConnector).to(RedisConnector)
	container.bind<MongoConnector>(TYPES.MongoConnector).to(MongoConnector)

	// DB / cache primitives from tst-base
	container.bind<RedisDb>(TYPES.RedisDb).to(RedisDb)
	container.bind<CacheContext>(TYPES.CacheContext).to(CacheContext)
	container.bind<MongoDb>(TYPES.MongoDb).to(MongoDb)

	// Feature builders — all bound; the registry decides which to call per
	// event via supports().
	container.bind<CoreFeatureBuilder>(TYPES.CoreFeatureBuilder).to(CoreFeatureBuilder)
	container
		.bind<PurchaseFeatureBuilder>(TYPES.PurchaseFeatureBuilder)
		.to(PurchaseFeatureBuilder)
	container.bind<CartFeatureBuilder>(TYPES.CartFeatureBuilder).to(CartFeatureBuilder)
	container.bind<SignupFeatureBuilder>(TYPES.SignupFeatureBuilder).to(SignupFeatureBuilder)
	container.bind<LoginFeatureBuilder>(TYPES.LoginFeatureBuilder).to(LoginFeatureBuilder)
	container.bind<SearchFeatureBuilder>(TYPES.SearchFeatureBuilder).to(SearchFeatureBuilder)

	// Feature pipeline
	container.bind<FeatureValidator>(TYPES.FeatureValidator).to(FeatureValidator)
	container.bind<IdempotencyService>(TYPES.IdempotencyService).to(IdempotencyService)
	container.bind<FeatureRepository>(TYPES.FeatureRepository).to(FeatureRepository)
	container.bind<BuilderRegistry>(TYPES.BuilderRegistry).to(BuilderRegistry)
	container.bind<FeatureService>(TYPES.FeatureService).to(FeatureService)
	container.bind<FeatureConsumer>(TYPES.FeatureConsumer).to(FeatureConsumer)
}
