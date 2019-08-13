import { Method } from '../objects/Method';

export class Event {

	method: Method;
	session: number;
	lineNumber: number;
	kind: string; //ex: stepIn, stepOut, ...

	constructor(method: Method, lineNumber: number, kind: string) {
		this.method = method;
		this.lineNumber = lineNumber;
		this.kind = kind;
	}
}
