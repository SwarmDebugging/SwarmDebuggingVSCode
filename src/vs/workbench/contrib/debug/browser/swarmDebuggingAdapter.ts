// tslint:disable-next-line: import-patterns
import { request } from 'graphql-request';

let currentSessionId = -1;
const SERVER_URL = 'http://localhost:8080/graphql?';

class Invocation {

	invoking: Method;
	invoked: Method;
	session: number;

	constructor(invoked: Method){
		this.invoked = invoked;
	}

}

class Method {

	name: string;
	type: string;

	constructor(name: string, type:string){
		this.name = name;
		this.type = type;
	}

}

class SwarmDebugEvent {

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

function getEventInfo(response: DebugProtocol.Response, lastCalledFunction?: string) {

	//sort out the commands
	switch(response.command) {
		case 'stepIn': {
			getStepInInfo(response, lastCalledFunction);
			break;
		}
		case 'stepOut': {

			break;
		} //add more cases
		default: {
			return;
		}
	}

}

//lastcalledid in server
function getStepInInfo(response: DebugProtocol.Response, lastCalledFunction?: string) {

	let invoked = new Method(response.body.stackFrames[0].name, response.body.stackFrames[0].source.path);

	let event = new SwarmDebugEvent(invoked, response.body.stackFrames[0].line, 'Step Into');

	let invocation = new Invocation(invoked);
	if(lastCalledFunction){
	//	invocation.invoking = new Method(lastCalledFunction);
	}




}

//Where does this belong?
function sendMethod(method: Method) {

	//const querySession =

	//const queryType = `mutation `

	//const query = `mutation methodCreate($name: String, $type: string)`;



}
