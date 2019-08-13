import { Session } from './swarmClasses/objects/Session';
import { SessionService } from './swarmClasses/services/sessionService';

export const SERVERURL = 'http://localhost:8080/graphql?';

export class SwarmAdapter {
	// Control variables
	private steppedIn: boolean = false;
	private secondStackTrace: boolean = false;

	// Data to persist
	private vscodeSession: string;
	private swarmSession: Session;
	private swarmSessionService: SessionService = new SessionService();
	private invoked: string;
	private invoking: string;

	constructor(){}

	async tryPersist(response: DebugProtocol.Response) {
		if (response.command === 'stepIn') {
			this.steppedIn = true;
		}

		if (this.secondStackTrace && response.command === 'stackTrace') {
			this.invoking = response.body.stackFrames[0].name;
			// pegar session
			let result = await this.swarmSessionService.getByVscodeId(this.vscodeSession);
			if (result instanceof Session) {
				this.swarmSession = result;
			}
			// aqui vai salvar
			this.secondStackTrace = false;
		}

		if (this.steppedIn) {
			if (response.command === 'threads') {
				this.steppedIn = true;
			} else if (response.command === 'stackTrace') {
				this.invoked = response.body.stackFrames[0].name;
				this.steppedIn = false;
				this.secondStackTrace = true;
			}
		}
	}

	setSession(vscodeSessionId: string) {
		this.vscodeSession = vscodeSessionId;
	}
}
