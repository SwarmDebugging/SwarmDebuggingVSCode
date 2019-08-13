/*// tslint:disable-next-line: import-patterns
import { request } from 'graphql-request';

let currentSessionId = -1;
const SERVER_URL = 'http://localhost:8080/graphql?';

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
*/
