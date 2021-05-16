const sanitizeHtml = require('sanitize-html')
const _ = {
  forOwn: require('lodash/forOwn')
}

const InputSanitizer = function () {
  var relaxedOptions = {
    allowedTags: ['b', 'i', 'em', 'strong', 'small', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul',
      'br', 'p', 'u'],
    allowedAttributes: {
      a: ['href']
    }
  }

  var restrictedOptions = {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: function (text) {
      return text.replace(/&amp;/, '&')
    }
  }

  function trimWhiteSpaces (blip) {
    var processedBlip = {}
    _.forOwn(blip, function (value, key) {
      processedBlip[key.trim()] = value.trim()
    })
    return processedBlip
  }

  var self = {}
  self.sanitize = function (rawBlip) {
    var blip = trimWhiteSpaces(rawBlip)
	//console.log('Rawblip after trimming:')
	//console.log(blip)
    blip.description = sanitizeHtml(blip.Description, relaxedOptions)
    blip.name = sanitizeHtml(blip.Technology, relaxedOptions)
    blip.status = sanitizeHtml(blip.Status, restrictedOptions)
    blip.ring = sanitizeHtml(blip.Horizon, restrictedOptions)
    blip.topic = sanitizeHtml(blip.Theme, restrictedOptions)
	blip.tags = blip.Tags.split('|').map(function(tag){return tag.trim();})

    return blip
  }

  self.reducer = function(result, value) {
	  var processedBlip = self.sanitize(value)
	  switch(processedBlip.Status)
	  {
		  case 'ok':
		  case 'new':
		  case 'strike':
		  case 'moved':
		  case 'gap':
			result.push(processedBlip)
			break
		  case 'hide':
		    break
		  default:
		    console.log('Unknown status: ' + processedBlip.Status)
	  }
	  return result
  }

  self.sanitizeForProtectedSheet = function (rawBlip, header) {
    var blip = trimWhiteSpaces(rawBlip)

    const descriptionIndex = header.indexOf('Description')
    const nameIndex = header.indexOf('Technology')
    const statusIndex = header.indexOf('Status')
    const ringIndex = header.indexOf('Horizon')
    const topicIndex = header.indexOf('Theme')
	const tagsIndex = header.indexOf('Tags')

    const description = descriptionIndex === -1 ? '' : blip[descriptionIndex]
    const name = nameIndex === -1 ? '' : blip[nameIndex]
    const status = statusIndex === -1 ? '' : blip[statusIndex]
    const ring = ringIndex === -1 ? '' : blip[ringIndex]
    const topic = topicIndex === -1 ? '' : blip[topicIndex]
	const tags = tagsIndex === -1 ? '' : blip[tagsIndex]

    blip.description = sanitizeHtml(description, relaxedOptions)
    blip.name = sanitizeHtml(name, relaxedOptions)
    blip.status = sanitizeHtml(status, restrictedOptions)
    blip.ring = sanitizeHtml(ring, restrictedOptions)
    blip.topic = sanitizeHtml(topic, restrictedOptions)
    blip.tags = tags.split('|').map(function(tag){return tag.trim();})

    return blip
  }

  return self
}

module.exports = InputSanitizer
