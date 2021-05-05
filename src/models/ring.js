const Ring = function (name, order) {
  var self = {}

  self.name = function () {
    return 'Horizon ' + name
  }

  self.order = function () {
    return order
  }

  return self
}

module.exports = Ring
