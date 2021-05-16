const d3 = require('d3')
const d3tip = require('d3-tip')
const Chance = require('chance')
const _ = require('lodash/core')

const RingCalculator = require('../util/ringCalculator')
const QueryParams = require('../util/queryParamProcessor')
const AutoComplete = require('../util/autoComplete')

const MIN_BLIP_WIDTH = 12
const HALF_BLIP_HEIGHT = 7
const BLIP_HEIGHT = 2 * HALF_BLIP_HEIGHT
const ANIMATION_DURATION = 100
const SLICE = 95

const Radar = function (size, radar) {
  var svg, radarElement, quadrantButtons, buttonsGroup, header, alternativeDiv

  var tip = d3tip().attr('class', 'd3-tip').html(function (text) {
    return text
  })

  var ringCalculator = new RingCalculator(radar.rings().length, size)

  var self = {}
  var chance

  function getSize() {
	  return size
  }

  function centerX () {
    return 0
  }

  function centerY () {
    return 7 * Math.round(size / 8)
  }

  function toRadian (angleInDegrees) {
    return Math.PI * angleInDegrees / 180
  }

  function plotQuadrant (rings, quadrant) {
    var quadrantGroup = svg.append('g')
      .attr('class', 'quadrant-group quadrant-group-' + quadrant.order)

    rings.forEach(function (ring, i) {
      var arc = d3.arc()
        .innerRadius(ringCalculator.getRadius(i))
        .outerRadius(ringCalculator.getRadius(i + 1))
        .startAngle(toRadian(quadrant.startAngle))
        .endAngle(toRadian(quadrant.startAngle - SLICE))

      quadrantGroup.append('path')
        .attr('d', arc)
        .attr('class', 'ring-arc-' + ring.order())
        .attr('transform', 'translate(' + centerX() + ', ' + centerY() + ')')
    })

    return quadrantGroup
  }

  function plotTexts (quadrantGroup, rings, quadrant) {
    rings.forEach(function (ring, i) {
	  radius = (ringCalculator.getRadius(i) + ringCalculator.getRadius(i + 1)) / 2
	  theta = SLICE
	  y = radius * Math.cos(toRadian(theta))
	  x = radius * Math.sin(toRadian(theta))
      quadrantGroup.append('text')
        .attr('class', 'line-text')
        .attr('y', centerY() + 30 - y)
        .attr('x', centerX() + x - 30)
        .attr('text-anchor', 'middle')
        .text(ring.name())
    })
  }

  function trianglePath() {
    // a fat triangle centred for some reason at 421,297
    return 'M 402 311 L 440 311 c -7 -10 -6 -21 -19 -28 c -13 7 -13 18 -19 28'
  }

  function triangle (blip, x, y, order, group) {
    return group.append('path').attr('d', trianglePath())
      .attr('transform', 'scale(' + (blip.width / 34) + ') translate(' + (-404 + x * (34 / blip.width) - 17) + ', ' + (-282 + y * (34 / blip.width) - 17) + ')')
      .attr('class', order)
  }

  function triangleLegend (x, y, group) {
    return group.append('path').attr('d', trianglePath())
      .attr('transform', 'scale(' + (22 / 64) + ') translate(' + (-404 + x * (64 / 22) - 17) + ', ' + (-282 + y * (64 / 22) - 17) + ')')
  }

  function circlePath() {
	// a squashed circle
	return 'M 422 285 c -24 0 -24 30 0 30 c 24 0 24 -30 0 -30'
	//'M420.084,282.092c-1.073,0-2.16,0.103-3.243,0.313c-6.912,1.345-13.188,8.587-11.423,16.874c1.732,8.141,8.632,13.711,17.806,13.711c0.025,0,0.052,0,0.074-0.003c0.551-0.025,1.395-0.011,2.225-0.109c4.404-0.534,8.148-2.218,10.069-6.487c1.747-3.886,2.114-7.993,0.913-12.118C434.379,286.944,427.494,282.092,420.084,282.092'
  }

  function circle (blip, x, y, order, group) {
    return (group || svg).append('path')
      .attr('d', circlePath())
	  .attr('transform', 'scale(' + (blip.width / 34) + ') translate(' + (-404 + x * (34 / blip.width) - 17) + ', ' + (-282 + y * (34 / blip.width) - 17) + ')')
      .attr('class', order)
  }

  function circleLegend (x, y, group) {
    return (group || svg).append('path')
      .attr('d', circlePath())
	  .attr('transform', 'scale(' + (22 / 64) + ') translate(' + (-404 + x * (64 / 22) - 17) + ', ' + (-282 + y * (64 / 22) - 17) + ')')
  }
  
  function square(blip, x, y, order, status, group) {
    return (group || svg).append('rect')
	.attr('x', x - HALF_BLIP_HEIGHT)
	.attr('y', y - HALF_BLIP_HEIGHT)
	.attr('width', BLIP_HEIGHT)
	.attr('height', BLIP_HEIGHT)
	.attr('stroke', blip.status()=='ok' ? 'green' : (blip.status()=='new' ? 'red' : (blip.status()=='moved' ? 'yellow' : 'darkgrey')))
	.attr('fill', blip.status()=='ok' ? 'green' : (blip.status()=='new' ? 'red' : (blip.status()=='moved' ? 'yellow' : 'darkgrey')))
    .attr('class', 'blip-icon-' + status) // TODO: move the stroke and fill colours to classes based on status
  }

  function addRing (ring, order) {
    var table = d3.select('.quadrant-table.' + order)
    table.append('h3').text(ring)
    return table.append('ul')
  }

  function calculateBlipCoordinates (blip, chance, minRadius, maxRadius, startAngle, blipTotal, blipIndex) {
    var gap = maxRadius - minRadius
	var margin = 1/8 * gap
	if(minRadius == 0) margin = 1/10 * gap // smaller margin for ring zero (there is less space)
	var standOff = minRadius + margin

	// our quadrant is cut off at the top by the viewbox because centerY is not zero, so we cap topmostY here with a small margin for the font size/blip size
    var topmostY = Math.min(centerY() - BLIP_HEIGHT, minRadius + 7/8 * gap) // no cos adjustment, we assume vertical axis, ie 0 angle
	var bottommostY = HALF_BLIP_HEIGHT // for larger slices than 90 degrees we waste space at the bottom, but meh

    var yGap = (topmostY - bottommostY) / (blipTotal - 1) 
	var ySpaced = topmostY - (blipIndex * yGap) // evenly spaced y coordinates
	xMargin = margin
	if(ySpaced < standOff) xMargin = Math.sqrt(standOff * standOff - ySpaced * ySpaced) // our left margin is xMargin or the chord length of inner radius (standOff)
	if(xMargin < margin) xMargin = margin // tweak to fix a wobble in the inner ring

    xMax = Math.sqrt(maxRadius * maxRadius - ySpaced * ySpaced) // the outermost x coordinate for this ring at height ySpaced
	console.log(blipIndex + '/' + blipTotal + ' (' + blip.number() + '): ySpaced = %d, xMargin = %d, xMax = %d', ySpaced, xMargin, xMax)
	
    var x = centerX() + xMargin
    var y = centerY() - ySpaced
    console.log('x,y = %d, %d', x, y)
    return [x, y, xMax - x]
  }

  function thereIsCollision (blip, coordinates, allCoordinates) {
    return allCoordinates.some(function (currentCoordinates) {
      return (Math.abs(currentCoordinates[0] - coordinates[0]) < blip.width) && (Math.abs(currentCoordinates[1] - coordinates[1]) < blip.width)
    })
  }

  function plotBlips (quadrantGroup, rings, quadrantWrapper) {
    var blips, quadrant, startAngle, order

    quadrant = quadrantWrapper.quadrant
    startAngle = quadrantWrapper.startAngle
    order = quadrantWrapper.order

    d3.select('.quadrant-table.' + order)
      .append('h2')
      .attr('class', 'quadrant-table__name')
      .text(quadrant.name())

    blips = quadrant.blips()
    rings.forEach(function (ring, i) {
      var ringBlips = blips.filter(function (blip) {
        return blip.ring() === ring
      })

      if (ringBlips.length === 0) {
        return
      }

      var maxRadius, minRadius

      minRadius = ringCalculator.getRadius(i)
      maxRadius = ringCalculator.getRadius(i + 1)

      var sumRing = ring.name().split('').reduce(function (p, c) {
        return p + c.charCodeAt(0)
      }, 0)
      var sumQuadrant = quadrant.name().split('').reduce(function (p, c) {
        return p + c.charCodeAt(0)
      }, 0)
      chance = new Chance(Math.PI * sumRing * ring.name().length * sumQuadrant * quadrant.name().length)

      var ringList = addRing(ring.name(), order)
      var allBlipCoordinatesInRing = []
	  var blipNumberInRing = 0
	  
      ringBlips.forEach(function (blip) {
        const coordinates = findBlipCoordinates(blip,
          minRadius,
          maxRadius,
          startAngle,
          allBlipCoordinatesInRing,
		  ringBlips.length,
		  blipNumberInRing++)

        allBlipCoordinatesInRing.push(coordinates)
		if(blip.status() != 'gap') drawBlipInCoordinates(blip, coordinates, order, quadrantGroup, ringList)
      })
    })
  }

  function findBlipCoordinates (blip, minRadius, maxRadius, startAngle, allBlipCoordinatesInRing, blipTotal, blipIndex) {
    var coordinates = calculateBlipCoordinates(blip, chance, minRadius, maxRadius, startAngle, blipTotal, blipIndex)

	return coordinates
  }

  // lifted straight outta StackOverflow, https://stackoverflow.com/questions/24784302/wrapping-text-in-d3?lq=1
  // text-shadow added
  function wrap(text, width) {
    text.each(function () {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            x = text.attr("x"),
            y = text.attr("y"),
            dy = 0, //parseFloat(text.attr("dy")),
            tspan = text.text(null)
                        .append("tspan")
                        .attr("x", x)
                        .attr("y", y)
                        .attr("dy", dy + "em")
					    .attr('style', 'text-shadow: 0px 0px 2px black;');
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                            .attr("x", x)
                            .attr("y", y)
                            .attr("dy", ++lineNumber * lineHeight + dy + "em")
							.attr('style', 'text-shadow: 0px 0px 2px black;')
                            .text(word);
            }
        }
    });
  }  

  function drawBlipInCoordinates (blip, coordinates, order, quadrantGroup, ringList) {
    var x = coordinates[0]
    var y = coordinates[1]
	var xMaxLen = coordinates[2]

    var group = quadrantGroup.append('g').attr('class', 'blip-link').attr('id', 'blip-link-' + blip.number())

	square(blip, x, y, order, blip.status(), group)

    group.append('text')
      .attr('x', x)
      .attr('y', y + 4)
      .attr('class', 'blip-number-' + blip.status())
      .attr('text-anchor', 'middle')
      .text(blip.number())

    group.append('text')
      .attr('x', x + 4 + blip.width / 2)
      .attr('y', y + 4)
      .attr('class', 'blip-text-' + blip.status())
      .attr('text-anchor', 'left')
      .text(blip.name())
	  .call(wrap, xMaxLen - 5 - blip.width)

    var blipListItem = ringList.append('li')
    var blipText = blip.number() + '. ' + blip.name() + '. '
    blipListItem.append('div')
      .attr('class', 'blip-list-item')
      .attr('id', 'blip-list-item-' + blip.number())
      .text(blipText)
    console.log('BlipText: ' + blipText)
	
    var blipItemDescription = blipListItem.append('div')
      .attr('id', 'blip-description-' + blip.number())
      .attr('class', 'blip-item-description')
    if (blip.description()) {
      blipItemDescription.append('p').html(blip.description())
    }
    blipItemDescription.append('div')
      .attr('class', 'blip-list-theme')
      .attr('id', 'blip-list-theme-' + blip.number())
      .text(blip.topic())

	blip.tags().forEach(function(tag) {
		var cls = internalTag(tag)
		group.classed(cls, true)
	})

    var mouseOver = function () {
      d3.selectAll('g.blip-link').attr('opacity', 0.3)
      group.attr('opacity', 1.0)
      blipListItem.selectAll('.blip-list-item').classed('highlight', true)
      tip.show(blip.name(), group.node())
    }

    var mouseOut = function () {
      d3.selectAll('g.blip-link').attr('opacity', 1.0)
      blipListItem.selectAll('.blip-list-item').classed('highlight', false)
      tip.hide().style('left', 0).style('top', 0)
    }

    blipListItem.on('mouseover', mouseOver).on('mouseout', mouseOut)
    group.on('mouseover', mouseOver).on('mouseout', mouseOut)

    var clickBlip = function () {
      d3.select('.blip-item-description.expanded').node() !== blipItemDescription.node() &&
        d3.select('.blip-item-description.expanded').classed('expanded', false)
      blipItemDescription.classed('expanded', !blipItemDescription.classed('expanded'))

      blipItemDescription.on('click', function () {
        d3.event.stopPropagation()
      })
    }
    group.on('click', clickBlip)
    blipListItem.on('click', clickBlip)
  }

  function removeRadarLegend () {
    d3.select('.legend').remove()
  }

  function drawLegend (order) {
    removeRadarLegend()

    var triangleKey = 'New or moved'
    var circleKey = 'No change'

    var container = d3.select('svg').append('g')
      .attr('class', 'legend legend' + '-' + order)

    var x = 10
    var y = 10

    if (order === 'first') {
      x = 4 * size / 5
      y = 1 * size / 5
    }

    if (order === 'second') {
      x = 1 * size / 5 - 15
      y = 1 * size / 5 - 20
    }

    if (order === 'third') {
      x = 1 * size / 5 - 15
      y = 4 * size / 5 + 15
    }

    if (order === 'fourth') {
      x = 4 * size / 5
      y = 4 * size / 5
    }

    d3.select('.legend')
      .attr('class', 'legend legend-' + order)
      .transition()
      .style('visibility', 'visible')

    triangleLegend(x, y, container)

    container
      .append('text')
      .attr('x', x + 15)
      .attr('y', y + 5)
      .attr('font-size', '0.8em')
      .text(triangleKey)

    circleLegend(x, y + 20, container)

    container
      .append('text')
      .attr('x', x + 15)
      .attr('y', y + 25)
      .attr('font-size', '0.8em')
      .text(circleKey)
  }

  function redrawFullRadar () {
    removeRadarLegend()
    tip.hide()
    d3.selectAll('g.blip-link').attr('opacity', 1.0)

    svg.style('left', 10).style('right', 0)

    d3.selectAll('.button')
      .classed('selected', false)
      .classed('full-view', true)

    d3.selectAll('.quadrant-table').classed('selected', false)
    d3.selectAll('.home-link').classed('selected', false)

    d3.selectAll('.quadrant-group')
      .transition()
      .duration(ANIMATION_DURATION)
      .attr('transform', 'scale(1)')

    d3.selectAll('.quadrant-group .blip-link')
      .transition()
      .duration(ANIMATION_DURATION)
      .attr('transform', 'scale(1)')

    d3.selectAll('.quadrant-group')
      .style('pointer-events', 'auto')
  }

  function searchBlip (_e, ui) {
    const { blip, quadrant } = ui.item
    const isQuadrantSelected = true //d3.select('div.button.' + quadrant.order).classed('selected')
    selectQuadrant.bind({}, quadrant.order)()
    const selectedDesc = d3.select('#blip-description-' + blip.number())
    d3.select('.blip-item-description.expanded').node() !== selectedDesc.node() &&
        d3.select('.blip-item-description.expanded').classed('expanded', false)
    selectedDesc.classed('expanded', true)

    d3.selectAll('g.blip-link').attr('opacity', 0.3)
    const group = d3.select('#blip-link-' + blip.number())
    group.attr('opacity', 1.0)
    d3.selectAll('.blip-list-item').classed('highlight', false)
    d3.select('#blip-list-item-' + blip.number()).classed('highlight', true)
    if (isQuadrantSelected) {
      tip.show(blip.name(), group.node())
    } else {
      // need to account for the animation time associated with selecting a quadrant
      tip.hide()

      setTimeout(function () {
        tip.show(blip.name(), group.node())
      }, ANIMATION_DURATION)
    }
  }

  function plotRadarHeader () {
    header = d3.select('body').insert('header', '#radar')
    header.append('div')
      .attr('class', 'radar-title')
      .append('div')
      .attr('class', 'radar-title__text')
      .append('h1')
      .text(document.title)
      .style('cursor', 'pointer')
      //.on('click', redrawFullRadar)

    alternativeDiv = header.append('div')
      .attr('id', 'alternative-buttons')

    return header
  }

  function plotQuadrantButtons (quadrants, header) {
    radarElement
      .append('div')
      .attr('class', 'quadrant-table ' + quadrants[0].order)
      .append('div')
      .classed('search-box', true)
      .append('input')
      .attr('id', 'auto-complete')
      .attr('placeholder', 'Search')
      .classed('search-radar', true)

    AutoComplete('#auto-complete', quadrants, searchBlip)
	d3.selectAll('.quadrant-table.' + quadrants[0].order).classed('selected', true)
  }

  function internalTag(tag) {
	  return 'tag-list-item-' + encodeURIComponent(tag.replace(/ /g,'', true)).replace(/%/g,'')
  }
  
  function plotTags (tags) {
    var tagDiv = radarElement
      .append('div')
      .attr('class', 'tag-table')
	  
    tagDiv.append('h3').text('Tags')
	var tagList = tagDiv.append('ul')
	tags.sort()
	_.each(tags, function (tag) {
	  var itag = internalTag(tag)
      var tagListItem = tagList.append('li')
      tagListItem.append('div')
        .attr('class', 'tag-list-item')
        .attr('id', itag)
        .text(tag)

      var mouseOver = function () {
        d3.selectAll('g.blip-link').attr('opacity', 0.1)
		d3.selectAll('g.' + itag).attr('opacity', 1.0)
        tagListItem.selectAll('.tag-list-item').classed('highlight', true)
      }

      var mouseOut = function () {
        d3.selectAll('g.blip-link').attr('opacity', 1.0)
        tagListItem.selectAll('.tag-list-item').classed('highlight', false)
      }

      tagListItem.on('mouseover', mouseOver).on('mouseout', mouseOut)
	})
  }
  
  function plotRadarFooter () {
    d3.select('body')
      .insert('div', '#radar-plot + *')
      .attr('id', 'footer')
      .append('div')
      .attr('class', 'footer-content')
      .append('p')
      .html('Radar code originally by <a href="https://www.thoughtworks.com"> ThoughtWorks</a>, ' +
      '<a href="https://github.com/thoughtworks/build-your-own-radar">Build Your Own Radar (github)</a> available for download and self-hosting.')
  }

  function selectQuadrant (order) {
    d3.selectAll('.home-link').classed('selected', false)

    d3.selectAll('.button').classed('selected', false).classed('full-view', false)
    d3.selectAll('.button.' + order).classed('selected', true)
    d3.selectAll('.quadrant-table').classed('selected', false)
    d3.selectAll('.quadrant-table.' + order).classed('selected', true)
    d3.selectAll('.blip-item-description').classed('expanded', false)

    d3.selectAll('.quadrant-group')
      .style('pointer-events', 'auto')

  }
  
  self.init = function () {
    radarElement = d3.select('body').append('div').attr('id', 'radar')
    return self
  }

  function constructSheetUrl (sheetName) {
    var noParamUrl = window.location.href.substring(0, window.location.href.indexOf(window.location.search))
    var queryParams = QueryParams(window.location.search.substring(1))
    var sheetUrl = noParamUrl + '?sheetId=' + queryParams.sheetId + '&sheetName=' + encodeURIComponent(sheetName)
    return sheetUrl
  }

  function plotAlternativeRadars (alternatives, currentSheet) {
    var alternativeSheetButton = alternativeDiv
      .append('div')
      .classed('multiple-sheet-button-group', true)

    alternativeSheetButton.append('p').text('Choose a sheet to populate radar')
    alternatives.forEach(function (alternative) {
      alternativeSheetButton
        .append('div:a')
        .attr('class', 'first full-view alternative multiple-sheet-button')
        .attr('href', constructSheetUrl(alternative))
        .text(alternative)

      if (alternative === currentSheet) {
        d3.selectAll('.alternative').filter(function () {
          return d3.select(this).text() === alternative
        }).attr('class', 'highlight multiple-sheet-button')
      }
    })
  }

  self.plot = function () {
    var rings, quadrants, alternatives, currentSheet

    rings = radar.rings()
    quadrants = radar.quadrants()
    alternatives = radar.getAlternatives()
    currentSheet = radar.getCurrentSheet()
    var header = plotRadarHeader()

    if (alternatives.length) {
      plotAlternativeRadars(alternatives, currentSheet)
    }

    radarElement.style('height', size + BLIP_HEIGHT + 'px')
	dd = radarElement.append('div').attr('class','svgdiv').attr('style','float:left')
    svg = dd.append('svg').call(tip)
    svg.attr('id', 'radar-plot')
	  .attr('width', size)
	  .attr('height', size + BLIP_HEIGHT)
	  .attr('style', 'outline: 1px solid black;')

    plotQuadrantButtons(quadrants, header)

    _.each(quadrants, function (quadrant) {
      var quadrantGroup = plotQuadrant(rings, quadrant)
      plotTexts(quadrantGroup, rings, quadrant)
      plotBlips(quadrantGroup, rings, quadrant)
    })

	plotTags(radar.getTags())
    plotRadarFooter()
	
	selectQuadrant('first')
  }

  return self
}

module.exports = Radar
