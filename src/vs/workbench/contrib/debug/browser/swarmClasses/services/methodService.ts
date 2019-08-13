// tslint:disable-next-line: import-patterns
import { request } from 'graphql-request';
import { SERVERURL } from '../../swarmAdapter';
import { Method } from '../objects/Method';

export class MethodService {
	method: Method | undefined;

	constructor(method?: Method) {
		this.method = method;
	}

	setProduct(method: Method) {
		this.method = method;
	}

	async create() {
		if (this.method) {
			const query = `
			mutation methodCreate(
				$methodName: String,
				$methodSignature: String,
				$typeId: Long
			){
				methodCreate(
				  method:{
					name: $methodName
					signature: $methodSignature
					type: {
					  id: $typeId
					}
				  }){
				  id
				}
			  }`;

			const variables = {
				methodName: this.method.getName(),
				methodSignature: this.method.getSignature(),
				typeId: this.method.getType()
			};

			let data = await request(SERVERURL, query, variables);
			this.method.setID(data.methodCreate.id);

			return true;
		} else {
			return false;
		}
	}
}
