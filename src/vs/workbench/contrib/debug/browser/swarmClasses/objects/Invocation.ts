import { Method } from '../objects/Method';

export class Invocation {

	invoking: Method;
	invoked: Method;
	session: number;

	constructor(invoked: Method){
		this.invoked = invoked;
	}

}
