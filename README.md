# Serialize

Manipulate block elements as if they were text.

## Installation

```
$ npm install serialize-elem
```

## Motivation

Serialize's primary use case is in-browser rich text editing. The tree structure of HTML documents can be a pain to work with; Serialize aims to abstract away some of the difficulties by allowing you to manipulate block elements as if they were text. Inline stylings are stored as markups that can be applied to the text.

## API

### var s = new Serialize( element )

Serializes the element into an object. Example:

```html
<p>Some <b>bold</b> and <em>italic</em> text</p>
```

gets converted to:

```js
{
    type: 'p'
    text: 'Some bold and italic text',
    length: 25,
    markups: [{
        type: Serialize.types.bold,
        start: 5,
        end: 9
    }, {
        type: Serialize.types.italic,
        start: 14,
        end: 20
    }]
}
```

Where `Serialize.types.*` is a number. Currently, only `<code>`, `<a>`, and various italic and bold types (elements, like `<b>`, `<strong>`, etc, but also other elements with, say, `style="font-weight: bold"`) are supported. If you need to support a broader range of inline elements, adding support is trivial.

__Note__: Serialize use getters and setters to automagically update the `length` property of a serialization when its text is changed; in most cases, there should be no reason to set the length of a serialization.

### Serialize#addMarkup( markup )

Adds the given markup to the serialization. Markups are ordered first by type, then by start index, then by end index. Returns the context to allow chaining.

### Serialize#addMarkups( markups )

As above, but with an array of markups.

### Serialize#removeMarkup( markup )

Removes or truncates a serialization’s markups such that no markups of the same type as the given markup overlap the given markup’s range.

__Note__: for the link type, this method does not check the `href`. Be careful with it.

### Serialize#mergeAdjacent( )

Merges adjacent or overlapping markups of the same type. If you've recently added a markup, you should call this method to normalize things.

### Serialize#toElement( )

Return a new element resembling the one that was serialized.

### Serialize#replace( pattern, substr )

Works like [`String#replace`][replace] on the serialization’s text, but updates the markups appropriately. Same signature as [`String#replace`][replace]. Returns a new serialization.

If a match overlaps a markup, that markup is truncated so as to make it smaller. Consider the following element:

```html
<p>One..<em>. two</em></p>
```

This gets serialized as:

```js
{
    type: 'p',
    text: 'One... two',
    length: 10,
    markups: [{
        type: Serialize.types.italic,
        start: 5,
        end: 10
    }]
}
```

Replacing adjacent periods with ellipses by calling

```js
.replace(/\.\.\./, '…')
```

on this serialization results in the following:

```js
{
    type: 'p',
    text: 'One… two',
    length: 8,
    markups: [{
        type: Serialize.types.italic,
        start: 4,
        end: 8
    }]
}
```

which, when converted back to en element, will look like:

```html
<p>One…<em> two</em></p>
```

### Serialize#substr( start [, length] )

Works the same as [`String#substr`][substr]. Returns a new serialization representing the duplicated substring, complete with the appropriate markups.

### Serialize#substring( start [, end] )

Like [`String#substring`][substring]. Returns a new serialization.

### Serialize#append( other )

Returns a new serialization which results from appending the serialization `other` to the serialization this method was called upon. If we’re comparing serializations to text:

```js
var result = serialization.append(other)

// Is similar to:
var result = string + otherString
```

If `other` is a string, the serialization returned will have that string appended to its text, and any markups that previously terminated at the end of the serializtion are extended such that they terminate at the end of the new serialization. For example:

```html
<p><em>1</em><strong>2</strong></p>
<!-- Serializing, then calling .append('345'), results in: -->
<p><em>1</em><strong>2345</strong></p>
```

If you wish to avoid extending markups, simply add your text directly to the serialization’s.

### Serialize#equals( other )

Returns a boolean; true if the serializations are equivalent (i.e. they would produce identical elements by calling [`Serialize#toElement`][toElement]), false otherwise. Continuing the comparison to Strings, `Serialize#equals` is like the `===` operator.

```js
var areSame = serialization.equals(other)

// Is like:
var areSame = string === otherString
```

### Serialize#toString( )

This overrides the inherited `toString` to return the outerHTML of the Serialization’s equivalent element. For example:

```js
var p = document.createElement('p')
p.innerHTML = 'A <em>B</em> C'

var s = new Serialize(p)
console.log('' + s)
// "<p>A <em>B</em> C</p>"
```

### Serialize.fromText( text [, tag] )

Creates a serialization with the given String. The serialization will have no markups. The `type` property of the returned instance can optionally be specified using the `tag` argument, defaulting to `p`.

### Serialize.fromJSON( json )

If you have previously `JSON.stringify`’d a serialization, you can convert it to a “live” instance of Serialize by using this method.

## License

MIT.

[replace]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace
[substr]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substring
[substring]: https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/substring
[toElement]: #serializationtoelement-
