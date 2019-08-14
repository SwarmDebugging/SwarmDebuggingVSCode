import { Method } from '../objects/Method';
import { Session } from 'vs/workbench/contrib/debug/browser/swarmClasses/objects/Session';

export class Invocation {

	id: number;
	invoking: Method;
	invoked: Method;
	session: Session;

	constructor(invoking: Method, invoked: Method, session: Session) {
		this.invoking = invoking;
		this.invoked = invoked;
		this.session = session;
	}

	getID() {
		return this.id;
	}

	setID(id: number) {
		this.id = id;
	}

	getInvoking() {
		return this.invoking;
	}

	getInvoked() {
		return this.invoked;
	}

	getSession() {
		return this.session;
	}

}
