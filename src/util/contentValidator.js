const _ = {
  map: require('lodash/map'),
  uniqBy: require('lodash/uniqBy'),
  capitalize: require('lodash/capitalize'),
  each: require('lodash/each')
}

const MalformedDataError = require('../../src/exceptions/malformedDataError')
const ExceptionMessages = require('./exceptionMessages')

const ContentValidator = function (columnNames) {
  var self = {}
  columnNames = columnNames.map(function (columnName) {
    return columnName.trim()
  })

  self.verifyContent = function () {
    if (columnNames.length === 0) {
      throw new MalformedDataError(ExceptionMessages.MISSING_CONTENT)
    }
  }

  self.verifyHeaders = function () {
	//console.log('Column names:')
	//console.log(columnNames)
    _.each(['Technology', 'Ring', 'Theme', 'Description', 'Status', 'Tags'], function (field) {
      if (columnNames.indexOf(field) === -1) {
        throw new MalformedDataError(ExceptionMessages.MISSING_HEADERS)
      }
    })
  }

  return self
}

module.exports = ContentValidator
