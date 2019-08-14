// tslint:disable-next-line: import-patterns
import { request } from 'graphql-request';
import { SERVERURL } from '../../swarmAdapter';
import { Event } from '../objects/Event';

export class EventService {
	event: Event | undefined;

	constructor(event?: Event) {
		this.event = event;
	}

	setEvent(event: Event) {
		this.event = event;
	}

	async create() {
		if (this.event) {
			const query = `
			mutation eventCreate(
				$sessionId: Long,
				$eventLineNumber: Int,
				$eventKind: String,
				$methodId: Long
			){
				eventCreate(
				  event: {
					session: {
					  id: $sessionId
					},
					lineNumber: $eventLineNumber,
					kind: $eventKind,
					method: {
						id: $methodId
					}
				  }
				){
				  id
				}
			  }`;

			const variables = {
				sessionId: this.event.getSession().getID(),
				eventLineNumber: this.event.getLineNumber(),
				eventKind: this.event.getKind(),
				methodId: this.event.getMethod().getID()
			};

			let data = await request(SERVERURL, query, variables);
			this.event.setID(data.eventCreate.id);

			return true;
		} else {
			return false;
		}
	}
}
