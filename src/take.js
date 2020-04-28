module.exports = (ifn) =>
	function*(n = Infinity) {
		let iterable = ifn();
		let stop = Number(n);
		let i = 0;
		for (const x of iterable) {
			if (i === stop) {
				break;
			}
			yield x;
			i++;
		}
	};
