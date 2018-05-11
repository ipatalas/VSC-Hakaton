import * as ts from 'typescript';
import { SourceFile } from '../sourceFile';
import { Controller } from './controller';
import { ClassMethod } from './method';
import { ClassProperty } from './property';
import _ = require('lodash');
import { isTsKind } from '../typescriptParser';

export class ControllerParser {
	private results: Controller[] = [];

	constructor(private file: SourceFile) {
	}

	public parse = () => {
		this.parseChildren(this.file.sourceFile);

		return this.results;
	}

	private parseChildren = (node: ts.Node) => {
		if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
			const functionDeclaration = node as ts.FunctionDeclaration;

			const controller = new Controller();
			controller.path = this.file.path;
			controller.name = controller.className = functionDeclaration.name.text;
			controller.pos = this.file.sourceFile.getLineAndCharacterOfPosition(functionDeclaration.name.pos);

			this.results.push(controller);
		} else if (this.isControllerClass(node)) {
			const controller = new Controller();
			controller.path = this.file.path;
			controller.name = controller.className = node.name.text;
			controller.pos = this.file.sourceFile.getLineAndCharacterOfPosition(node.members.pos);
			controller.members = node.members.map(this.createMember).filter(item => item); // filter out undefined (not implemented member types)
			controller.baseClassName = this.getBaseClassName(node);

			this.results.push(controller);
		} else if (node.kind === ts.SyntaxKind.CallExpression) {
			const call = node as ts.CallExpression;

			if (this.isAngularModule(call.expression)) {
				const controllerCall = this.findControllerRegistration(call.parent);
				if (controllerCall) {
					const controllerName = controllerCall.arguments[0] as ts.StringLiteral;
					const controllerIdentifier = controllerCall.arguments[1] as ts.Identifier;

					if (controllerName.text !== controllerIdentifier.text) {
						const ctrl = this.results.find(c => c.className === controllerIdentifier.text);
						if (ctrl) {
							ctrl.name = controllerName.text;
						}
					}
				}
			} else {
				node.getChildren().forEach(this.parseChildren);
			}
		} else {
			node.getChildren().forEach(this.parseChildren);
		}
	}

	private findControllerRegistration = (node: ts.Node): ts.CallExpression => {
		if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
			const pae = node as ts.PropertyAccessExpression;
			if (pae.name.text === 'controller' && pae.parent && pae.parent.kind === ts.SyntaxKind.CallExpression) {
				const call = pae.parent as ts.CallExpression;
				if (call.arguments.length === 2) {
					return call;
				}
			}
		}

		if (node.parent) {
			return this.findControllerRegistration(node.parent);
		}
	}

	private isAngularModule = (expression: ts.Expression) => {
		const pae = expression as ts.PropertyAccessExpression;

		return expression.kind === ts.SyntaxKind.PropertyAccessExpression &&
			(pae.expression.kind === ts.SyntaxKind.Identifier && pae.name.kind === ts.SyntaxKind.Identifier) &&
			(pae.expression as ts.Identifier).text === 'angular' && (pae.name as ts.Identifier).text === 'module';
	}

	private createMember = (member: ts.ClassElement) => {
		if (member.kind === ts.SyntaxKind.MethodDeclaration) {
			return ClassMethod.fromNode(member as ts.MethodDeclaration, this.file.sourceFile);
		} else if (member.kind === ts.SyntaxKind.GetAccessor) {
			return ClassProperty.fromProperty(member as ts.GetAccessorDeclaration, this.file.sourceFile);
		} else if (member.kind === ts.SyntaxKind.PropertyDeclaration) {
			const prop = member as ts.PropertyDeclaration;

			if (prop.initializer && prop.initializer.kind === ts.SyntaxKind.ArrowFunction) {
				return ClassMethod.fromNode(prop, this.file.sourceFile);
			} else {
				return ClassProperty.fromProperty(prop, this.file.sourceFile);
			}
		}
	}

	private getBaseClassName = (classDeclaration: ts.ClassDeclaration): string => {
		if (classDeclaration.heritageClauses) {
			const extendsClause = classDeclaration.heritageClauses.find(hc => hc.token === ts.SyntaxKind.ExtendsKeyword);

			if (extendsClause && extendsClause.types.length === 1) {
				const typeExpression = extendsClause.types[0].expression;

				if (isTsKind<ts.PropertyAccessExpression>(typeExpression, ts.SyntaxKind.PropertyAccessExpression)) {
					return typeExpression.name.text;
				}

				return typeExpression.getText();
			}
		}
	}

	private isControllerClass(node: ts.Node): node is ts.ClassDeclaration {
		return isTsKind<ts.ClassDeclaration>(node, ts.SyntaxKind.ClassDeclaration) && !this.implementsComponentOptions(node);
	}

	private implementsComponentOptions(classDeclaration: ts.ClassDeclaration) {
		if (!classDeclaration.heritageClauses) {
			return false;
		}

		const typeNames = _.flatMap(classDeclaration.heritageClauses, x => x.types.map(t => t.getText()));

		return typeNames.some(t => t.includes('IComponentOptions'));
	}
}
