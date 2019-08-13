import * as vscode from 'vscode';
import { request } from 'graphql-request';
import { Developer } from './developer';
import { SERVERURL } from '../extension';
import { Product } from './product';

export class Task {

    private id: number = -1;
    private color: string;
    private title: string;
    private url: string;
    private product: Product;

    constructor(color: string,
        title: string,
        url: string,
        product: Product) {

        this.color = color;
        this.title = title;
        this.url = url;
        this.product = product;
    }

    getID() {
        return this.id;
    }

    setID(id: number) {
        this.id = id;
    }

    getColor() {
        return this.color;
    }

    setColor(color: string) {
        this.color = color;
    }

    getTitle() {
        return this.title;
    }

    setTitle(title: string) {
        this.title = title;
    }

    getURL() {
        return this.url;
    }

    setURL(url: string) {
        this.url = url;
    }

    getProduct() {
        return this.product;
    }

    setProduct(product: Product) {
        this.product = this.product;
    }
}