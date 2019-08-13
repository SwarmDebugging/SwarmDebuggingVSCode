import * as vscode from "vscode";
import { request } from "graphql-request";
import { SERVERURL } from "../extension";
import { Session } from "../objects/session";

export class SessionService {
  session: Session | undefined;

  constructor(session?: Session) {
    this.session = session;
  }

  setSession(session: Session) {
    this.session = session;
  }

  async stopSession() {
    if (this.session === undefined) {
      return;
    }

    //Is this the right place for this message?
    if (this.session.getID() < 1) {
      vscode.window.showInformationMessage("No session active");
      return 0;
    }

    const query = `mutation sessionUpdate($sessionId: Long!, $finished: Date) {
                sessionUpdate(id: $sessionId, finished: $finished){
                    id
                }
            }`;

    let date = new Date().toISOString();

    const variables = {
      sessionId: this.session.getID(),
      finished: date
    };

    let data = await request(SERVERURL, query, variables);
    return data.sessionUpdate.id;
  }

  async startSession(): Promise<number> {
    if (this.session) {
      var taskId = this.session.getTask().getID();
      var currentlyActiveSessionId = this.session.getID();
      var currentUserId = this.session.getDeveloper().getID();
      var sessionDescription = this.session.getDescription();
    } else {
      return -1;
    }

    if (currentlyActiveSessionId > 0) {
      vscode.window.showInformationMessage("A session is already active");
      return 0;
    }

    //project and label attributes?

    if (sessionDescription === undefined) {
      return -1;
    } else if (!sessionDescription) {
      return await this.startSession();
    }

    //needs developerid and taskid
    const query = `mutation sessionStart($developerId: Long!, $taskId: Long!, $description: String) {
                sessionStart(session:{
                    task:{
                        id: $taskId
                        done: false
                    }
                    developer:{
                        id: $developerId
                    }
                    description: $description
                }) {
                    id
                }
            }`;

    const variables = {
      developerId: currentUserId,
      taskId: taskId,
      description: sessionDescription
    };

    //have to add session already running and others, add session stop

    let data = await request(SERVERURL, query, variables);
    if (data.sessionStart.id) {
      return data.sessionStart.id;
    } else {
      vscode.window.showErrorMessage("error while creating session");
    }

    return 1;
  }

  async updateSession() {
    if (this.session === undefined) {
      return;
    }

    const query = `mutation sessionUpdate($sessionId: Long!, $vscodeSession: String!) {
        sessionUpdate(id: $sessionId, vscodeSession: $vscodeSession){
            id
        }
    }`;

    const variables = {
      sessionId: this.session.getID(),
      vscodeSession: this.session.getVscodeSession()
    };

    await request(SERVERURL, query, variables);
  }

}
