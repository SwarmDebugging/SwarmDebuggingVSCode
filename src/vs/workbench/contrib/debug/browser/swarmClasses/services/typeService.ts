import { request } from 'graphql-request';
import { SERVERURL } from '../extension';
import { Type } from '../objects/type';
import { Artefact } from '../objects/artefact';
import { Product } from '../objects/product';
import { Task } from '../objects/task';
import { Session } from '../objects/session';
import { Developer } from '../objects/developer';

export class TypeService {

    artefact: Artefact | undefined;
    type: Type | undefined;

    constructor(artefact?: Artefact,
        type?: Type) {
        this.artefact = artefact;
        this.type = type;
    }

    setArtefact(artefact: Artefact) {
        this.artefact = artefact;
    }

    setType(type: Type) {
        this.type = type;
    }

    async create() {

        if (this.type && this.artefact) {

            const query = `mutation typeCreate(
                $typeName: String, 
                $typeFullName: String, 
                $typeFullPath: String, 
                $sessionId: Long,
                $inputSource: String) {
                typeCreate(typeWrapper: {
                type: {
                    name: $typeName,
                    fullName: $typeFullName,
                    fullPath: $typeFullPath,
                    session:{
                    id: $sessionId
                    }
                }, 
                source: $inputSource
                }) {
                id
                artefact {
                    id
                    typeHash
                }
                }
            }`;

            const variables = {
                typeName: this.type.name,
                typeFullName: this.type.getFullName(),
                typeFullPath: this.type.getFullPath(),
                sessionId: this.type.getSession().getID(),
                inputSource: this.artefact.getSourceCode()
            };

            var data = await request(SERVERURL, query, variables);
            this.type.setID(data.typeCreate.id);
            this.artefact.setID(data.typeCreate.artefact.id);
            this.artefact.setTypeHash(data.typeCreate.artefact.id);

            return true;

        } else {

            return false;

        }

    }


    async getAllBySession(session: Session) {

        const query = `query types($sessionId: Long) {
            types(sessionId: $sessionId) {
            id
            fullPath
            fullName
            name
            artefact {
                id
                sourceCode
                typeHash
            }
            session {
                id
                description
                started
                label
                project
                purpose
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
            }
        }`;

        const variables = {
            sessionId: session.getID()
        };

        var data = await request(SERVERURL, query, variables);

        var answer: Type[] = [];
        var i = 0;
        for (let i = 0; i < data.types.length; i++) {

            let tempArtefact = new Artefact(data.types[i].artefact.sourceCode);
            tempArtefact.setID(data.types[i].artefact.id);
            tempArtefact.setTypeHash(data.types[i].artefact.typeHash);

            let tempProduct = new Product(data.types[i].session.task.product.id,
                data.types[i].session.task.product.name);

            let tempTask = new Task(data.types[i].session.task.color,
                data.types[i].session.task.title,
                data.types[i].session.task.url,
                tempProduct);
            tempTask.setID(data.types[i].session.task.id);

            let tempDeveloper = new Developer(data.types[i].session.developer.color,
                data.types[i].session.developer.name);
            tempDeveloper.setID(data.types[i].session.developer.id);

            let tempSession = new Session(data.types[i].session.description,
                data.types[i].session.started,
                data.types[i].session.label,
                data.types[i].session.project,
                data.types[i].session.purpose,
                tempDeveloper,
                tempTask);
            tempSession.setID(data.types[i].session.id);

            let tempType = new Type(data.types[i].fullName,
                data.types[i].fullPath,
                data.types[i].name,
                tempArtefact,
                tempSession);
            tempType.setID(data.types[i].id);

            answer[i] = tempType;
        }

        return answer;

    }

}

