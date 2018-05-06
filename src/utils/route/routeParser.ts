import { TypescriptParser } from '../typescriptParser';
import { Route } from './route';
import { SourceFile } from '../sourceFile';
import * as ts from 'typescript';
import { ConfigParser } from '../configParser';
import { TemplateParser } from '../templateParser';

export class RouteParser {
	private tsParser: TypescriptParser;
	private templateParser: TemplateParser;
	private results: Route[] = [];

	constructor(file: SourceFile) {
		this.tsParser = new TypescriptParser(file);
		this.templateParser = new TemplateParser();
	}

	public parse() {
		this.parseChildren(this.tsParser.sourceFile);

		return this.results;
	}

	private parseChildren = (node: ts.Node) => {
		if (node.kind === ts.SyntaxKind.CallExpression) {
			const call = node as ts.CallExpression;

			if (call.expression.kind === ts.SyntaxKind.PropertyAccessExpression
				&& (call.expression as ts.PropertyAccessExpression).name.text === 'state'
				&& call.arguments.length === 2) {
				const routeName = call.arguments[0] as ts.StringLiteral;
				const configObj = call.arguments[1] as ts.Expression;
				this.results.push(this.createRoute(routeName, configObj));

				const expr = call.expression as ts.PropertyAccessExpression;
				if (expr.expression.kind === ts.SyntaxKind.CallExpression) {
					this.parseChildren(expr.expression);
				}
			} else {
				call.getChildren().forEach(this.parseChildren);
			}
		} else {
			node.getChildren().forEach(this.parseChildren);
		}
	}

	private createRoute = (routeName: ts.StringLiteral, configNode: ts.Expression) => {
		const configObj = this.tsParser.getObjectLiteralValueFromNode(configNode);
		const config = new ConfigParser(configObj);

		const route = new Route();
		route.name = routeName.text;
		route.pos = this.tsParser.sourceFile.getLineAndCharacterOfPosition(routeName.pos);
		route.path = this.tsParser.path;

		route.template = this.templateParser.createTemplate(config, this.tsParser);

		return route;
	}
}
