// tslint:disable-next-line: import-patterns
import { request } from 'graphql-request';
import { SERVERURL } from '../../swarmAdapter';
import { Method } from '../objects/Method';

export class MethodService {
	method: Method | undefined;

	constructor(method?: Method) {
		this.method = method;
	}

	setMethod(method: Method) {
		this.method = method;
	}

	async create() {
		if (this.method) {
			const query = `
			mutation methodCreate(
				$methodName: String,
				$typeId: Long
			){
				methodCreate(
				  method:{
					name: $methodName
					type: {
					  id: $typeId
					}
				  }){
				  id
				}
			  }`;

			const variables = {
				methodName: this.method.getName(),
				typeId: this.method.getType().getID()
			};

			let data = await request(SERVERURL, query, variables);
			this.method.setID(data.methodCreate.id);

			return true;
		} else {
			return false;
		}
	}
}
