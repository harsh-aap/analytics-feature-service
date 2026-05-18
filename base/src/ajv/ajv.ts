import Ajv, { KeywordDefinition } from 'ajv'
import addErrors from 'ajv-errors'
import addFormats from 'ajv-formats'
import addKeywords from 'ajv-keywords'
import { ObjectId } from 'mongodb'

class AjvFormat {
	private ajvInstance: Ajv

	constructor() {
		this.ajvInstance = new Ajv({
			allErrors: true,
			coerceTypes: true,
			useDefaults: true,
			removeAdditional: true,
		})

		addFormats(this.ajvInstance)
		addKeywords(this.ajvInstance)
		addErrors(this.ajvInstance)

		// Add standard keywords
		this.addMongoIdKeyword()
	}

	private addMongoIdKeyword(): void {
		const mongoIdKeyword: KeywordDefinition = {
			keyword: 'mongoId',
			type: 'string',
			validate: (schema: boolean, data: string): boolean => {
				try {
					return ObjectId.isValid(data)
				} catch (err) {
					return false
				}
			},
			errors: true,
			error: {
				message: 'Invalid Id',
			},
		}

		this.ajvInstance.addKeyword(mongoIdKeyword)
	}

	public addCustomKeyword(keyword: KeywordDefinition): void {
		this.ajvInstance.addKeyword(keyword)
	}

	public getAjvInstance(): Ajv {
		return this.ajvInstance
	}
}

export { AjvFormat }
