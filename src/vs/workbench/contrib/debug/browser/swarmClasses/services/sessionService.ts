// tslint:disable-next-line: import-patterns
import { request } from 'graphql-request';
import { SERVERURL } from '../../swarmAdapter';
import { Session } from '../objects/Session';
import { Product } from '../objects/Product';
import { Developer } from '../objects/Developer';
import { Task } from '../objects/Task';

export class SessionService {
	session: Session | undefined;

	constructor(session?: Session) {
		this.session = session;
	}

	setSession(session: Session) {
		this.session = session;
	}

	async getByVscodeId(vscodeId: string): Promise<Session | undefined> {
		if (vscodeId === undefined) {
			return;
		}

		const query = `query sessionsVscode($sessionId: String){
			sessionsVscode(vscodeSession: $sessionId) {
				id
				description
				started
				label
				project
				purpose
				vscodeSession
				developer {
					id
					color
					username
				}
				task {
					id
					color
					title
					url
					product {
						id
						name
					}
				}
			}
		}`;

		const variables = {
			sessionId: vscodeId
		};

		let data = await request(SERVERURL, query, variables);

		let answer: Session[] = [];
		for (let i = 0; i < data.sessionsVscode.length; i++) {
			let tempProduct = new Product(data.sessionsVscode[i].task.product.name, -1);
			tempProduct.setID(data.sessionsVscode[i].task.product.id);

			let tempTask = new Task(
				data.sessionsVscode[i].task.color,
				data.sessionsVscode[i].task.title,
				data.sessionsVscode[i].task.url,
				tempProduct
			);
			tempTask.setID(data.sessionsVscode[i].task.id);

			let tempDeveloper = new Developer(
				data.sessionsVscode[i].developer.color,
				data.sessionsVscode[i].developer.name
			);
			tempDeveloper.setID(data.sessionsVscode[i].developer.id);

			let tempSession = new Session(
				data.sessionsVscode[i].description,
				data.sessionsVscode[i].started,
				data.sessionsVscode[i].label,
				data.sessionsVscode[i].project,
				data.sessionsVscode[i].purpose,
				tempDeveloper,
				tempTask
			);
			tempSession.setID(data.sessionsVscode[i].id);

			answer[i] = tempSession;
		}

		return answer[0];
	}
}
