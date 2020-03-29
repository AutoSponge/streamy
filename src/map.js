// fn ->* obj* -> fn(obj.next().value, i)
module.exports = fn =>
  function * (iterable) {
    for (const x of iterable) {
      yield fn(x)
    }
  }
