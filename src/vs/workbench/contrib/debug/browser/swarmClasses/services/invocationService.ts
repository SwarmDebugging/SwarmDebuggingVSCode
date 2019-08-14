// tslint:disable-next-line: import-patterns
import { request } from 'graphql-request';
import { SERVERURL } from '../../swarmAdapter';
import { Invocation } from '../objects/Invocation';

export class InvocationService {
	invocation: Invocation | undefined;

	constructor(invocation?: Invocation) {
		this.invocation = invocation;
	}

	setInvocation(invocation: Invocation) {
		this.invocation = invocation;
	}

	async create() {
		if (this.invocation) {
			const query = `
			mutation invocationCrea(
				$invokedID: Long,
				$invokingID: Long,
				$sessionID: Long,
			){
				invocationCreate(
				  invocation: {
					virtual: true
					invoked: {
					  id: $invokedID: Long,
					},
					invoking:{
					  id: $invokingID: Long,
					},
					session:{
					  id: $sessionID
					}
				  }){
					  id
				}
			  }`;

			const variables = {
				sessionID: this.invocation.getSession().getID(),
				invokingID: this.invocation.getInvoking().getID(),
				invokedID: this.invocation.getInvoked().getID()
			};

			let data = await request(SERVERURL, query, variables);
			this.invocation.setID(data.eventCreate.id);

			return true;
		} else {
			return false;
		}
	}
}
