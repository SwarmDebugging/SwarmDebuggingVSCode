import { Developer } from "./developer";
import { Task } from "./task";

export class Session {
  private id: number = -1;
  private description: string = "";
  private started: Date;
  private finished: Date = new Date();
  private label: string;
  private project: string;
  private purpose: string;
  private developer: Developer;
  private task: Task;
  private vscodeSession: string = "";

  constructor(
    description: string,
    started: Date,
    label: string,
    project: string,
    purpose: string,
    developer: Developer,
    task: Task
  ) {
    this.description = description;
    this.started = started;
    this.label = label;
    this.project = project;
    this.purpose = purpose;
    this.developer = developer;
    this.task = task;
  }

  getID() {
    return this.id;
  }

  setID(id: number) {
    this.id = id;
  }

  getDescription() {
    return this.description;
  }

  setDescription(description: string) {
    this.description = description;
  }

  getDeveloper() {
    return this.developer;
  }

  setDeveloper(developer: Developer) {
    this.developer = developer;
  }

  getStarted() {
    return this.started;
  }

  setStarted(started: Date) {
    this.started = started;
  }

  getFinished() {
    return this.finished;
  }

  setFinished(finished: Date) {
    this.finished = finished;
  }

  getLabel() {
    return this.label;
  }

  setlabel(label: string) {
    this.label = label;
  }

  getProject() {
    return this.project;
  }

  setProject(project: string) {
    this.project = project;
  }

  getPurpose() {
    return this.purpose;
  }

  setPurpose(purpose: string) {
    this.purpose = purpose;
  }

  getTask() {
    return this.task;
  }

  setTask(task: Task) {
    this.task = task;
  }

  getVscodeSession() {
    return this.vscodeSession;
  }

  setVscodeSession(vscodeSession: string) {
    this.vscodeSession = vscodeSession;
  }
  
}
