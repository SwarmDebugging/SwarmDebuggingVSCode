/**
 * Swarm Debugging Project Addition
 */

import { Method } from '../objects/Method';
import { Session } from '../objects/Session';

export class Event {

	id: number;
	method: Method;
	session: Session;
	lineNumber: number;
	kind: string; //ex: stepIn, stepOut, ...

	constructor(method: Method, session: Session, lineNumber: number, kind: string) {
		this.method = method;
		this.session = session;
		this.lineNumber = lineNumber;
		this.kind = kind;
	}

	getID() {
		return this.id;
	}

	setID(id: number) {
		this.id = id;
	}

	getMethod() {
		return this.method;
	}

	getSession() {
		return this.session;
	}

	getLineNumber() {
		return this.lineNumber;
	}

	getKind() {
		return this.kind;
	}

}
