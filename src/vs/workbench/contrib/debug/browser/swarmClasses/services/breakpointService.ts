import { request } from 'graphql-request';
import { Breakpoint } from '../objects/breakpoint';
import { Type } from '../objects/type';
import { Artefact } from '../objects/artefact';
import { Product } from '../objects/product';
import { Task } from '../objects/task';
import { Session } from '../objects/session';
import { Developer } from '../objects/developer';
import { SERVERURL } from '../extension';

export class BreakpointService {

    breakpoint: Breakpoint | undefined;

    constructor(breakpoint?: Breakpoint) {
        this.breakpoint = breakpoint;
    }

    setBreakpoint(breakpoint: Breakpoint) {
        this.breakpoint = breakpoint;
    }

    async create() {

        if (this.breakpoint) {

            const query = `mutation breakpointCreate(
                $breakpointLineNumber: Int, 
                $typeId: Long) {
              breakpointCreate(breakpoint: {
                lineNumber: $breakpointLineNumber,
                type: {
                  id: $typeId
                }
              }){
                id
              }
            }`;

            const variables = {
                breakpointLineNumber: this.breakpoint.getLineNumber(),
                typeId: this.breakpoint.getType().getID()
            };

            var data = await request(SERVERURL, query, variables);
            this.breakpoint.setID(data.breakpointCreate.id);

            return true;

        } else {

            return false;

        }

    }

    async getAll(task: Task) {

        const query = `query breakpoint($taskId: Long){
            breakpoint(taskId: $taskId) {
            lineNumber,
            type{
                id,
                fullPath,
                fullName,
                name,
                artefact{
                id,
                sourceCode,
                typeHash
                },
                session{
                id,
                description,
                started,
                label,
                project,
                purpose,
                developer{
                    id,
                    color,
                    username
                },
                task{
                    id,
                    color,
                    title,
                    product {
                    id,
                    name
                    }
                }
                }
            }
            }
        }`;

        const variables = {
            taskId: task.getID()
        };

        var data = await request(SERVERURL, query, variables);

        var answer: Breakpoint[] = [];
        for (let i = 0; i < data.breakpoint.length; i++) {

            let tempArtefact = new Artefact(data.breakpoint[i].type.artefact.sourceCode);
            tempArtefact.setID(data.breakpoint[i].type.artefact.id);
            tempArtefact.setTypeHash(data.breakpoint[i].type.artefact.typeHash);

            let tempProduct = new Product(data.breakpoint[i].type.session.task.product.id,
                data.breakpoint[i].type.session.task.product.name);

            let tempTask = new Task(data.breakpoint[i].type.session.task.color,
                data.breakpoint[i].type.session.task.title,
                data.breakpoint[i].type.session.task.url,
                tempProduct);
            tempTask.setID(data.breakpoint[i].type.session.task.id);

            let tempDeveloper = new Developer(data.breakpoint[i].type.session.developer.color,
                data.breakpoint[i].type.session.developer.name);
            tempDeveloper.setID(data.breakpoint[i].type.session.developer.id);

            let tempSession = new Session(data.breakpoint[i].type.session.description,
                data.breakpoint[i].type.session.started,
                data.breakpoint[i].type.session.label,
                data.breakpoint[i].type.session.project,
                data.breakpoint[i].type.session.purpose,
                tempDeveloper,
                tempTask);
            tempSession.setID(data.breakpoint[i].type.session.id);

            let tempType = new Type(data.breakpoint[i].type.fullName,
                data.breakpoint[i].type.fullPath,
                data.breakpoint[i].type.name,
                tempArtefact,
                tempSession);
            tempType.setID(data.breakpoint[i].type.id);

            let tempBreakpoint = new Breakpoint(data.breakpoint[i].lineNumber, tempType);

            answer[i] = tempBreakpoint;
        }

        return answer;

    }

}