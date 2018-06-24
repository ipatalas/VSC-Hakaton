import { getDirectiveSourceFile } from '../helpers';
import { Directive } from '../../../src/utils/directive/directive';
import should = require('should');

describe('Given Directive class when calling parse()', () => {
	it('with class based directive then the directive is properly parsed', async () => {
		const sourceFile = getDirectiveSourceFile('class_property_init_directive.ts');

		const results = await Directive.parse(sourceFile);

		should(results).be.lengthOf(1);
		const directive = results[0];
		should(directive.name).be.equal('classDirective');
		should(directive.htmlName).be.equal('class-directive');
		should(directive.restrict).be.equal('E');
	});

	it('with constructor initialized class based directive then the directive is properly parsed', async () => {
		const sourceFile = getDirectiveSourceFile('class_ctor_init_directive.ts');

		const results = await Directive.parse(sourceFile);

		should(results).be.lengthOf(1);
		const directive = results[0];
		should(directive.name).be.equal('classDirective');
		should(directive.htmlName).be.equal('class-directive');
		should(directive.restrict).be.equal('E');
	});

	it(`with directive without explicit 'restrict' then the it is set to default 'EA'`, async () => {
		const sourceFile = getDirectiveSourceFile('without_restrict_directive.ts');

		const results = await Directive.parse(sourceFile);

		should(results).be.lengthOf(1);
		should(results[0].restrict).be.equal('EA');
	});
});
