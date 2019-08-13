import * as vscode from 'vscode';

export class Product {

    private id: number = -1;
    private name: string = "";

    constructor(name: string) {
        this.name = name;
    }

    getID() {
        return this.id;
    }

    setID(id: number) {
        this.id = id;
    }

    getName() {
        return this.name;
    }

    setName(name: string) {
        this.name = name;
    }

}