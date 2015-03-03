'use strict';

var mergeAdjacent = require('./adjacent'),
    applyMarkup = require('./applyMarkup'),
    replaceNewlines = require('./replaceNewlines'),
    convert = require('./convert')

/**
 * Serialize(elem) converts the given element to an abstract,
 * stringifiable object.
 *
 * @param {Element} elem
 * @return {Serialize}
 */
function Serialize (elem) {
  if (!(this instanceof Serialize))
    return new Serialize(elem)

  if (!elem || elem.nodeType !== Node.ELEMENT_NODE)
    throw TypeError('Serialize can only serialize element nodes.')

  var text = ''

  this.length = 0
  this.markups = []
  this.type = elem.nodeName.toLowerCase()

  // Automatically update the length when setting the text.
  Object.defineProperty(this, 'text', {
    configurable: true,
    enumerable: true,
    get: function () {
      return text
    },
    set: function (newText) {
      this.length = newText.length
      text = newText
    }
  })

  convert(elem, this)
}

/**
 * Serialize#addMarkups(markups) adds the given markups to the
 * serialization. Markups are ordered by increasing type, then
 * by increasing start index, then increasing end index.
 *
 * @param {Array} markups
 * @return {Context}
 */
Serialize.prototype.addMarkups = function (toAdd) {
  var i

  if (!Array.isArray(toAdd))
    return this.addMarkup(toAdd)

  for (i = 0; i < toAdd.length; i += 1)
    this.addMarkup(toAdd[i])

  return this
}

/**
 * Serialize#addMarkup(toAdd) adds the given markup to the array
 * of markups as described above.
 *
 * @param {Object} toAdd
 * @return {Context}
 * @api Private
 */
Serialize.prototype.addMarkup =
Serialize.prototype._addMarkup = function (toAdd) {
  var i = 0

  while (this.markups[i] && toAdd.type > this.markups[i].type)
    i += 1

  while (this.markups[i] &&
         toAdd.type === this.markups[i].type &&
         toAdd.start > this.markups[i].start) {

    i += 1
  }

  while (this.markups[i] &&
         toAdd.type === this.markups[i].type &&
         toAdd.start === this.markups[i].start &&
         toAdd.end > this.markups[i].end) {

    i += 1
  }

  this.markups.splice(i, 0, toAdd)

  return this
}

/**
 * Serialize#mergeAdjacent() merges adjacent markups of the same type.
 *
 * @return {Context}
 */
Serialize.prototype.mergeAdjacent = function () {
  this.markups = mergeAdjacent(this.markups)

  return this
}

/**
 * Serialize#removeMarkup(markup) removes or truncates a serialization’s
 * markups such that no markups of the same type as the given markup
 * overlap the given markup’s range. NOTE: for the link type, this method
 * does not check the href.
 *
 * @param {Object} toRemove
 * @return {Context}
 */
Serialize.prototype.removeMarkup = function (toRemove) {
  var markup,
      before,
      after,
      i

  for (i = 0; i < this.markups.length; i += 1) {
    markup = this.markups[i]

    if (markup.type > toRemove.type) break
    if (markup.type !== toRemove.type) continue

    if (markup.start <= toRemove.start && markup.end >= toRemove.end) {
      before = {
        type: markup.type,
        start: markup.start,
        end: toRemove.start
      }

      after = {
        type: markup.type,
        start: toRemove.end,
        end: markup.end
      }

      if (markup.href !== undefined)
        before.href = after.href = markup.href

      if (after.start !== after.end && before.start !== before.end) {
        this.markups.splice(i, 1, before, after)
        i += 1
      } else if (before.start !== before.end) {
        this.markups[i] = before
      } else if (after.start !== after.end) {
        this.markups[i] = after
      } else {
        this.markups.splice(i, 1)
        i -= 1
      }

      return this
    }

    if (markup.start >= toRemove.start && markup.start < toRemove.end)
      markup.start = toRemove.end
    if (markup.end > toRemove.start && markup.end <= toRemove.end)
      markup.end = toRemove.start

    if (markup.end <= markup.start) {
      this.markups.splice(i, 1)
      i -= 1
    }
  }

  return this
}

/**
 * replace(match, str, index) replaces all occurences of 'match' in a
 * serialization with the string 'substr', updating markups as appropriate.
 * 'substr' can also be a String#replace appropriate function, with a
 * minor difference: if that function returns false, or returns a string
 * identical to the match, however, the markups will not be affected.
 *
 * @param {RegExp} match
 * @param {String || Function} substr
 * @return {Context}
 */
Serialize.prototype.replace = require('./replace')

/**
 * substr(start, length) works like String#substr, returning a new
 * serialization with the appropriate markups.
 *
 * @param {Int} start
 * @param {Int} length
 * @return {Serialize}
 */
Serialize.prototype.substr = function (start, length) {
  var substr = new Serialize(document.createElement(this.type)),
      newMarkup,
      markup,
      end,
      i

  if (!this.length || length <= 0)
    return substr

  while (start < 0)
    start = this.length + start

  if (length === undefined || start + length > this.length)
    length = this.length - start

  end = start + length

  substr.text = this.text.substr(start, length)

  for (i = 0; i < this.markups.length; i += 1) {
    markup = this.markups[i]

    if (markup.start < end && markup.end > start) {
      newMarkup = {
        type: markup.type,
        start: markup.start > start ? markup.start - start : 0,
        end: markup.end < end ? markup.end - start : end - start
      }

      if (markup.href !== undefined)
        newMarkup.href = markup.href

      substr.addMarkup(newMarkup)
    }
  }

  return substr
}

/**
 * substring(start, end) works like String#substring, returning a new
 * serialization with the appropriate markups.
 *
 * @param {Int} start
 * @param {Int} end
 * @return {Serialize}
 */
Serialize.prototype.substring = function (start, end) {
  var temp

  if (end < start) {
    temp = start
    start = end
    end = temp
  }

  if (start < 0) start = 0
  if (end < 0) end = 0

  if (end === undefined)
    end = this.length

  return this.substr(start, end - start)
}

/**
 * append(serialization) concatenates two serializations. It's like the
 * '+' operator for strings. Returns a new serialization.
 * '+' operator for strings. Returns a new serialization. If toAdd is a
 * string, markups that terminate at the end of the serialization are
 * extended so as to still terminate at the end of the returned
 * serialization.
 *
 * @param {Serialize} serialization
 * @param {Serialize || String} toAdd
 * @return {Serialize}
 */
Serialize.prototype.append = function (toAdd) {
  var serialization,
      newMarkup,
      markup,
      i

  if (!toAdd)
    return this.substr(0)

  if (typeof toAdd === 'string') {
    serialization = this.substr(0)

    for (i = 0; i < serialization.markups.length; i += 1) {
      markup = serialization.markups[i]

      if (markup.end === serialization.length)
        markup.end += toAdd.length
    }

    serialization.text += toAdd
    return serialization
  }

  serialization = new Serialize(document.createElement(this.type))
  serialization.text = this.text + toAdd.text

  for (i = 0; i < this.markups.length; i += 1) {
    markup = this.markups[i]

    newMarkup = {
      type: markup.type,
      start: markup.start,
      end: markup.end
    }

    if (markup.href !== undefined)
      newMarkup.href = markup.href

    serialization.addMarkup(newMarkup)
  }

  for (i = 0; i < toAdd.markups.length; i += 1) {
    markup = toAdd.markups[i]

    newMarkup = {
      type: markup.type,
      start: markup.start + this.length,
      end: markup.end + this.length
    }

    if (markup.href !== undefined)
      newMarkup.href = markup.href

    serialization.addMarkup(newMarkup)
  }

  serialization.mergeAdjacent()

  return serialization
}

/**
 * Serialize#equals(other) determines if two Serializations are
 * equivalent. Continuing with the comparison to strings, it’s like
 * the == operator.
 *
 * @param {Serialize} other
 * @return {Boolean}
 */
Serialize.prototype.equals = function (other) {
  var otherMarkup,
      markup,
      keys,
      i, j

  if (this.type !== other.type || this.text !== other.text ||
      this.markups.length !== other.markups.length)
    return false

  for (i = 0; i < this.markups.length; i += 1) {
    otherMarkup = other.markups[i]
    markup = this.markups[i]
    keys = Object.keys(markup)

    if (keys.length !== Object.keys(otherMarkup).length)
      return false

    for (j = 0; j < keys.length; j += 1) {
      if (markup[keys[j]] !== otherMarkup[keys[j]])
        return false
    }
  }

  return true
}

/**
 * Serialize#toElement() converts a serialization back to an element.
 *
 * @return {Element}
 */
Serialize.prototype.toElement = function () {
  var elem = document.createElement(this.type)

  elem.textContent = this.text

  this.markups.forEach(function (markup) {
    applyMarkup(elem, markup)
  })

  replaceNewlines(elem)

  // Remove possible empty text nodes (is this necessary?)
  elem.normalize()

  return elem
}

/**
 * toString() overrides the default toString to return the HTML of the
 * element this Serialization represents.
 *
 * @return {String}
 */
Serialize.prototype.toString = function () {
  return this.toElement().outerHTML
}

/**
 * Serialize.fromText(text [, tag]) creates a serialization with the
 * given text, optionally with a type 'tag'. 'tag' defaults to 'p'.
 * Returns a serialization with no markups.
 *
 * @param {String} text
 * @param {String} tag
 * @return {Serialize}
 */
Serialize.fromText = function (text, tag) {
  var s = new this(document.createElement(tag || 'p'))

  s.text = text
  return s
}

/**
 * Serialize.fromJSON(json) converts a stringified serialization to
 * a 'live' one. The only mandatory properties are text and type.
 * Markups will default to empty.
 *
 * @param {String} json
 * @return {Serialize}
 */
Serialize.fromJSON = function (json) {
  var s = new this(document.createElement('p')),
      result = JSON.parse(json)

  if (typeof result.text !== 'string' || !result.type)
    throw TypeError('Required properties: "type" and "text"')

  s.type = result.type
  s.text = result.text
  s.markups = result.markups || []

  return s
}

// Expose the type identifiers.
Serialize.types = require('./types')

module.exports = Serialize
