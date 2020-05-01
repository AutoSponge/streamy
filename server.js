const app = require('express')();
const fastJson = require('fast-json-stringify');
const faker = require('faker');
const a = require('awaiting');
const ecstatic = require('ecstatic');
const pipe = require('./src/pipe');
const map = require('./src/map');
const take = require('./src/take');

const names = {
	*hello() {
		while (true) {
			const hello = faker.name.findName();
			yield { hello };
		}
	}
};

const json = {
	*stream(g) {
		yield `[\n${g.next().value}`;
		for (const value of g) {
			yield `\n,\n${value}`;
		}
		yield '\n]\n';
	}
};

// our json schema
const schema = {
	out: {
		type: 'object',
		properties: {
			hello: { type: 'string' }
		}
	}
};

const createPump = (req, res) => {
	return async (g) => {
		let ready;
		let connected = true;
		while (connected) {
			req.connection.removeAllListeners('close');
			let { value, done } = g.next();
			if (done === true) {
				return true;
			}
			ready = res.write(value);
			if (ready === false) {
				await Promise.race([
					a.event(res, 'drain'),
					a
						.event(req.connection, 'close')
						.then(() => (connected = false))
				]);
			}
		}
	};
};

const stringify = fastJson(schema.out);
const process = pipe(take(names.hello), map(stringify), json.stream);

const theWholeWorld = 7.5 * 1e9;
app.get('/api/http', (req, res, next) => {
	const { limit = theWholeWorld } = req.query;
	res.set('Content-Type', 'application/stream+json');
	const pump = createPump(req, res);
	pump(process(limit))
		.then((finished) => {
			res.end();
			console.log({ finished });
		})
		.catch(next);
});

const html = {
	*stream(g) {
		yield `<ul>\n${g.next().value}`;
		for (const value of g) {
			yield `\n\n${value}`;
		}
		yield '\n</ul>\n';
	}
};
const toHTML = function(obj) {
	return `<li>${obj.hello}</li>`;
};
const processAsHTML = pipe(take(names.hello), map(toHTML), html.stream);

app.get('/api/html', (req, res, next) => {
	const { limit = theWholeWorld } = req.query;
	res.set('Content-Type', 'application/octet-stream');
	const pump = createPump(req, res);
	console.time('stream_html');
	pump(processAsHTML(limit))
		.then((finished) => {
			res.end();
			console.timeEnd('stream_html');
			console.log({ finished });
		})
		.catch(next);
});

app.use(ecstatic({ root: `${__dirname}/public` }));
app.use(require('./src/handle-error'));
app.listen(4000);
